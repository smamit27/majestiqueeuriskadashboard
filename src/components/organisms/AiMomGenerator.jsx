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
import './AiMomGenerator.css';


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
    <div className="section-card ai-mom-container ai-mom-generator-s1">
      
      {/* ── AI Secretary Agent Feedback Banner ── */}
      {agentFeedback && (
        <div
          data-testid="agent-feedback-toast"
          className="ai-mom-generator-s2" style={{ background: agentFeedback.type === 'success' ? '#ecfdf5' : agentFeedback.type === 'warning' ? '#fffbeb' : '#eff6ff', color: agentFeedback.type === 'success' ? '#065f46' : agentFeedback.type === 'warning' ? '#92400e' : '#1e40af', border: `1px solid ${agentFeedback.type === 'success' ? '#a7f3d0' : agentFeedback.type === 'warning' ? '#fde68a' : '#bfdbfe'}` }}
        >
          <div className="ai-mom-generator-s3">
            <Bot size={18} />
            <span>{agentFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setAgentFeedback(null)}
            className="ai-mom-generator-s4"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Top Header & Context ── */}
      <div className="no-print ai-mom-generator-s5">
        <div>
          <div className="ai-mom-generator-s6">
            <Sparkles size={14} color="#10b981" />
            AI Governance Suite
          </div>
          <h2 className="ai-mom-generator-s7">
            AI Minutes of Meeting (MOM) Generator
          </h2>
          <p className="ai-mom-generator-s8">
            Transform raw meeting discussions, voice notes, or bullet points into formal society minutes tailored for <strong>Building 'A'</strong> or <strong>Common Society Infrastructure</strong>.
          </p>
        </div>

        {/* Action Buttons: Monthly MOM Vault & Meeting History */}
        <div className="ai-mom-generator-s9">
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
            className="ai-mom-generator-s10" style={{ background: activeView === 'vault' ? '#1d4ed8' : '#eff6ff', color: activeView === 'vault' ? '#ffffff' : '#1d4ed8', border: activeView === 'vault' ? '1.5px solid #1d4ed8' : '1.5px solid #bfdbfe' }}
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
            className="button-secondary ai-mom-generator-s11"
            style={{ background: activeView === 'history' ? '#0f172a' : '#f8fafc', color: activeView === 'history' ? '#ffffff' : '#1e293b', border: activeView === 'history' ? '1.5px solid #0f172a' : '1.5px solid #cbd5e1' }}
          >
            <History size={15} />
            Meeting History & Templates ({savedMoms.length + OFFICIAL_MOM_TEMPLATES.length})
          </button>
        </div>
      </div>

      {/* ── Big Scope Switcher: Building 'A' vs Common ── */}
      <div className="no-print ai-mom-generator-s12">
        <label className="ai-mom-generator-s13">
          Select Target Meeting Scope:
        </label>
        <div className="ai-mom-generator-s14">
          
          {/* Wing A Option */}
          <div
            onClick={() => handleScopeChange('A_BUILDING')}
            className="ai-mom-generator-s15" style={{ border: scope === 'A_BUILDING' ? '2px solid #059669' : '1.5px solid #e5e7eb', background: scope === 'A_BUILDING' ? 'rgba(5, 150, 105, 0.05)' : '#ffffff', boxShadow: scope === 'A_BUILDING' ? '0 4px 14px rgba(5, 150, 105, 0.12)' : 'none' }}
          >
            <div className="ai-mom-generator-s16" style={{ background: scope === 'A_BUILDING' ? '#059669' : '#f3f4f6', color: scope === 'A_BUILDING' ? '#ffffff' : '#6b7280' }}>
              <Building2 size={22} />
            </div>
            <div>
              <div className="ai-mom-generator-s3">
                <span className="ai-mom-generator-s17">🏢 Building 'A' (Wing A)</span>
                {scope === 'A_BUILDING' && (
                  <span className="ai-mom-generator-s18">ACTIVE</span>
                )}
              </div>
              <p className="ai-mom-generator-s19">
                Majestique Euriska 'A' Building CHS Ltd. (87 flats, 11 floors). Lifts, Wing A parking allotment, DG battery, terrace, and internal housekeeping.
              </p>
            </div>
          </div>

          {/* Common Infrastructure Option */}
          <div
            onClick={() => handleScopeChange('COMMON')}
            className="ai-mom-generator-s15" style={{ border: scope === 'COMMON' ? '2px solid #2563eb' : '1.5px solid #e5e7eb', background: scope === 'COMMON' ? 'rgba(37, 99, 235, 0.05)' : '#ffffff', boxShadow: scope === 'COMMON' ? '0 4px 14px rgba(37, 99, 235, 0.12)' : 'none' }}
          >
            <div className="ai-mom-generator-s16" style={{ background: scope === 'COMMON' ? '#2563eb' : '#f3f4f6', color: scope === 'COMMON' ? '#ffffff' : '#6b7280' }}>
              <Globe2 size={22} />
            </div>
            <div>
              <div className="ai-mom-generator-s3">
                <span className="ai-mom-generator-s20">🌐 Common Society / All Wings</span>
                {scope === 'COMMON' && (
                  <span className="ai-mom-generator-s21">ACTIVE</span>
                )}
              </div>
              <p className="ai-mom-generator-s19">
                Shared Apex Infrastructure across Wings A, B, C & 14 Commercial Shops (231 units). Main Security Gate, STP, 5.39L Water Reservoir, and Eisha Builder handover.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* ── Main Input Card: Metadata & Raw Textarea ── */}
      <div className="no-print ai-mom-generator-s22">
        
        {/* Metadata Controls Row */}
        <div className="ai-mom-generator-s23">
          <div>
            <label className="ai-mom-generator-s24">
              Meeting Type
            </label>
            <select
              value={meetingType}
              onChange={e => setMeetingType(e.target.value)}
              className="attendance-register-input ai-mom-generator-s25"
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
            <label className="ai-mom-generator-s24">
              Meeting Date
            </label>
            <input
              type="date"
              value={meetingDate}
              onChange={e => setMeetingDate(e.target.value)}
              className="attendance-register-input ai-mom-generator-s26"
            />
          </div>

          <div>
            <label className="ai-mom-generator-s24">
              Meeting Time
            </label>
            <input
              type="text"
              value={meetingTime}
              onChange={e => setMeetingTime(e.target.value)}
              placeholder="e.g. 11:00 AM"
              className="attendance-register-input ai-mom-generator-s26"
            />
          </div>

          <div>
            <label className="ai-mom-generator-s24">
              Venue / Location
            </label>
            <input
              type="text"
              value={venue}
              onChange={e => setVenue(e.target.value)}
              placeholder="e.g. Society Office / Wing A"
              className="attendance-register-input ai-mom-generator-s26"
            />
          </div>
        </div>

        {/* AI Secretary Autonomous Quorum & Scanner Bar */}
        <div className="ai-mom-generator-s27">
          <div
            data-testid="quorum-status-pill"
            className="ai-mom-generator-s28" style={{ background: quorumInfo.isQuorumMet ? 'rgba(5, 150, 105, 0.1)' : 'rgba(217, 119, 6, 0.1)', color: quorumInfo.badgeColor, border: `1px solid ${quorumInfo.isQuorumMet ? '#a7f3d0' : '#fde68a'}` }}
          >
            <Bot size={13} />
            {quorumInfo.statusText}
          </div>

          <button
            type="button"
            data-testid="agent-autodetect-attendees-btn"
            onClick={handleAgentScanAttendees}
            className="ai-mom-generator-s29"
            title="Auto-scan raw notes and select present committee members"
          >
            <Zap size={13} color="#059669" />
            Auto-Detect Attendees from Notes
          </button>
        </div>

        {/* Attendees Row */}
        <div className="ai-mom-generator-s30">
          <div>
            <label className="ai-mom-generator-s24">
              Presided By / Chairperson
            </label>
            <input
              type="text"
              data-testid="mom-chairperson-input"
              value={chairperson}
              onChange={e => setChairperson(e.target.value)}
              placeholder="e.g. Society Chairman (optional)"
              className="attendance-register-input ai-mom-generator-s26"
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
        <div className="ai-mom-generator-s27">
          <label className="ai-mom-generator-s31">
            Enter Raw Notes / Discussions / Bullet Points:
          </label>
          <div className="ai-mom-generator-s32">
            <button
              type="button"
              data-testid="quick-wing-a-template-btn"
              onClick={() => {
                const tmpl = OFFICIAL_MOM_TEMPLATES.find(t => t.id === 'tmpl-wing-a-monthly');
                if (tmpl) handleLoadTemplateIntoForm(tmpl);
              }}
              className="ai-mom-generator-s33"
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
              className="ai-mom-generator-s34"
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
              className="ai-mom-generator-s35"
            >
              📝 Load Building 'A' Notes
            </button>
            <button
              type="button"
              onClick={() => {
                setScope('COMMON');
                setRawNotes(SAMPLE_COMMON_NOTES);
              }}
              className="ai-mom-generator-s36"
            >
              🌐 Load Common Notes
            </button>
            <button
              type="button"
              onClick={() => setRawNotes('')}
              className="ai-mom-generator-s37"
            >
              🧹 Clear
            </button>
            <button
              type="button"
              data-testid="agent-voice-dictate-btn"
              onClick={toggleVoiceDictation}
              className="ai-mom-generator-s38" style={{ border: isListening ? '1.5px solid #ef4444' : '1px solid #cbd5e1', background: isListening ? '#fef2f2' : '#ffffff', color: isListening ? '#dc2626' : '#334155' }}
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
              className="ai-mom-generator-s39"
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
          className="ai-mom-generator-s40"
        />

        {/* Textarea Footer: Stats & Generate Button */}
        <div className="ai-mom-generator-s41">
          <div className="ai-mom-generator-s42">
            <span>{stats.words} words</span> • <span>{stats.chars} characters</span> • <span>{stats.lines} lines</span>
          </div>

          <button
            type="button"
            data-testid="generate-mom-btn"
            onClick={handleGenerate}
            disabled={isGenerating || !rawNotes.trim()}
            className="ai-mom-generator-s43" style={{ background: scope === 'A_BUILDING' ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', cursor: isGenerating || !rawNotes.trim() ? 'not-allowed' : 'pointer', opacity: isGenerating || !rawNotes.trim() ? 0.6 : 1 }}
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
        <div className="mom-output-workspace ai-mom-generator-s44">
          
          {/* Navigation & Action Toolbar */}
          <div className="no-print ai-mom-generator-s45">
            
            {/* View Mode Tabs */}
            <div className="ai-mom-generator-s46">
              {generatedMom && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveView('preview')}
                    className="ai-mom-generator-s47" style={{ background: activeView === 'preview' ? '#ffffff' : 'transparent', color: activeView === 'preview' ? '#0f172a' : '#64748b', boxShadow: activeView === 'preview' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none' }}
                  >
                    📄 Official Letterhead
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('edit')}
                    className="ai-mom-generator-s47" style={{ background: activeView === 'edit' ? '#ffffff' : 'transparent', color: activeView === 'edit' ? '#0f172a' : '#64748b', boxShadow: activeView === 'edit' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none' }}
                  >
                    ✏️ Edit & Customize
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('actions')}
                    className="ai-mom-generator-s47" style={{ background: activeView === 'actions' ? '#ffffff' : 'transparent', color: activeView === 'actions' ? '#0f172a' : '#64748b', boxShadow: activeView === 'actions' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none' }}
                  >
                    📋 Action Register ({activeDoc.actionItems?.length || 0})
                  </button>
                  <button
                    type="button"
                    data-testid="view-poster-tab-btn"
                    onClick={() => setActiveView('poster')}
                    className="ai-mom-generator-s48" style={{ background: activeView === 'poster' ? '#ffffff' : 'transparent', color: activeView === 'poster' ? '#d90429' : '#64748b', boxShadow: activeView === 'poster' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none' }}
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
                className="ai-mom-generator-s48" style={{ background: activeView === 'vault' ? '#ffffff' : 'transparent', color: activeView === 'vault' ? '#1d4ed8' : '#64748b', boxShadow: activeView === 'vault' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none' }}
              >
                <FolderArchive size={14} color="#2563eb" />
                📁 Monthly MOM Vault
              </button>
              <button
                type="button"
                data-testid="tab-history-templates-btn"
                onClick={() => setActiveView('history')}
                className="ai-mom-generator-s47" style={{ background: activeView === 'history' ? '#ffffff' : 'transparent', color: activeView === 'history' ? '#0f172a' : '#64748b', boxShadow: activeView === 'history' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none' }}
              >
                🕒 History & Templates ({savedMoms.length + OFFICIAL_MOM_TEMPLATES.length})
              </button>
            </div>

            {/* Export & Action Buttons */}
            {generatedMom ? (
              <div className="ai-mom-generator-s49">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="button-primary ai-mom-generator-s50"
                  title="Print clean multi-page document"
                >
                  <Printer size={15} />
                  🖨️ Print / PDF
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="button-secondary ai-mom-generator-s50"
                  title="Copy markdown formatted MOM to clipboard"
                >
                  {copyFeedback ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
                  {copyFeedback ? 'Copied!' : 'Copy'}
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="button-secondary ai-mom-generator-s50"
                  title="Download formatted text file"
                >
                  <Download size={15} />
                  Export Text
                </button>

                <button
                  type="button"
                  onClick={handleSaveToRecords}
                  className="button-secondary ai-mom-generator-s50"
                  title="Save into persistent society records"
                >
                  {saveFeedback ? <Check size={15} color="#10b981" /> : <Save size={15} />}
                  {saveFeedback ? 'Saved!' : 'Save'}
                </button>

                <button
                  type="button"
                  data-testid="save-as-template-btn"
                  onClick={handleSaveAsTemplate}
                  className="button-secondary ai-mom-generator-s50"
                  title="Save this MOM structure as a reusable template in Meeting History"
                >
                  <BookmarkPlus size={15} color="#2563eb" />
                  Save as Template
                </button>

                <button
                  type="button"
                  data-testid="agent-whatsapp-broadcast-btn"
                  onClick={handleCopyWhatsAppNotice}
                  className="button-secondary ai-mom-generator-s51"
                  title="Copy ready-to-share WhatsApp circular with resolutions"
                >
                  <Share2 size={15} />
                  WhatsApp Broadcast
                </button>
              </div>
            ) : (
              <div className="ai-mom-generator-s52">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('mom-notes-textarea');
                    if (el && typeof el.scrollIntoView === 'function') {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  className="button-secondary ai-mom-generator-s50"
                >
                  <ArrowLeft size={14} />
                  Back to Notes & Generator
                </button>
              </div>
            )}
          </div>

          {/* AI Model Badge (Only when MOM generated) */}
          {generatedMom && activeDoc.aiModelUsed && (
            <div className="no-print ai-mom-generator-s53">
              <div>
                Generated with: <strong className="ai-mom-generator-s54">{activeDoc.aiModelUsed}</strong>
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
              className="report-printable-area ai-mom-generator-s55"
            >
              {/* Official Society Letterhead */}
              <div className="ai-mom-generator-s56">
                <h1 className="ai-mom-generator-s57">
                  {activeDoc.headerInfo.societyName}
                </h1>
                <p className="ai-mom-generator-s58">
                  {activeDoc.headerInfo.fullLegalHeader}
                </p>
                <div className="ai-mom-generator-s59">
                  <span className="ai-mom-generator-s60" style={{ background: activeDoc.scope === 'A_BUILDING' ? '#0b2b26' : '#1e3a8a' }}>
                    {activeDoc.headerInfo.scopeBadge}
                  </span>
                </div>
              </div>

              {/* Title & Metadata Strip */}
              <div className="ai-mom-generator-s61">
                <div className="ai-mom-generator-s62">
                  <h2 className="ai-mom-generator-s63">
                    MINUTES OF MEETING ({activeDoc.headerInfo.meetingType.toUpperCase()})
                  </h2>
                </div>
                <div className="ai-mom-generator-s64">
                  <div><strong>Date:</strong> {activeDoc.headerInfo.meetingDate}</div>
                  <div><strong>Time:</strong> {activeDoc.headerInfo.meetingTime}</div>
                  <div><strong>Venue:</strong> {activeDoc.headerInfo.venue}</div>
                  <div><strong>Presided By:</strong> {activeDoc.headerInfo.chairperson}</div>
                </div>
                <div className="ai-mom-generator-s65">
                  <strong>Attendees:</strong> {activeDoc.headerInfo.attendees.join(', ')}
                </div>
              </div>

              {/* Section 1: Executive Summary */}
              <div className="ai-mom-generator-s66">
                <h3 className="ai-mom-generator-s67">
                  1. Executive Summary & Purpose
                </h3>
                <p className="ai-mom-generator-s68">
                  {activeDoc.executiveSummary}
                </p>
              </div>

              {/* Section 2: Agenda Items & Decisions */}
              <div className="ai-mom-generator-s66">
                <h3 className="ai-mom-generator-s69">
                  2. Agenda Deliberations & Key Decisions
                </h3>
                <div className="ai-mom-generator-s70">
                  {activeDoc.agendaItems.map((item, idx) => (
                    <div key={idx} className="ai-mom-generator-s71">
                      <div className="ai-mom-generator-s72">
                        <span className="ai-mom-generator-s73">
                          Item {item.itemNo}: {item.title}
                        </span>
                        <span className="ai-mom-generator-s74">
                          {item.category}
                        </span>
                      </div>
                      <p className="ai-mom-generator-s75">
                        <strong>Discussion:</strong> {item.discussion}
                      </p>
                      <p className="ai-mom-generator-s76">
                        <strong>Decision Taken:</strong> {item.decision}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Formal Resolutions Passed */}
              <div className="ai-mom-generator-s66">
                <h3 className="ai-mom-generator-s69">
                  3. Formal Resolutions Passed
                </h3>
                <div className="ai-mom-generator-s77">
                  {activeDoc.resolutions.map((res, idx) => (
                    <div key={idx} className="ai-mom-generator-s78">
                      <div className="ai-mom-generator-s79">
                        <span className="ai-mom-generator-s80">
                          {res.resNo} : {res.subject}
                        </span>
                        <span className="ai-mom-generator-s81">
                          {res.verdict}
                        </span>
                      </div>
                      <div className="ai-mom-generator-s82">
                        Proposed by: <strong>{res.proposer}</strong> | Seconded by: <strong>{res.seconder}</strong>
                      </div>
                      <blockquote className="ai-mom-generator-s83">
                        {res.text}
                      </blockquote>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Action Items Table */}
              <div className="ai-mom-generator-s66">
                <h3 className="ai-mom-generator-s69">
                  4. Action Item Accountability Register
                </h3>
                <div className="ai-mom-generator-s84">
                  <table className="ai-mom-generator-s85">
                    <thead>
                      <tr className="ai-mom-generator-s86">
                        <th className="ai-mom-generator-s87">#</th>
                        <th className="ai-mom-generator-s87">Action Item / Task</th>
                        <th className="ai-mom-generator-s87">Assigned Owner</th>
                        <th className="ai-mom-generator-s87">Target Due Date</th>
                        <th className="ai-mom-generator-s87">Priority</th>
                        <th className="ai-mom-generator-s87">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeDoc.actionItems.map((act, idx) => (
                        <tr key={idx} className="ai-mom-generator-s88" style={{ background: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                          <td className="ai-mom-generator-s89">{act.id || idx + 1}</td>
                          <td className="ai-mom-generator-s87">{act.task}</td>
                          <td className="ai-mom-generator-s90">{act.assignedTo}</td>
                          <td className="ai-mom-generator-s91">{act.dueDate}</td>
                          <td className="ai-mom-generator-s87">
                            <span className="ai-mom-generator-s92" style={{ background: act.priority === 'HIGH' ? '#fee2e2' : act.priority === 'MEDIUM' ? '#fef3c7' : '#e0f2fe', color: act.priority === 'HIGH' ? '#dc2626' : act.priority === 'MEDIUM' ? '#d97706' : '#0369a1' }}>
                              {act.priority}
                            </span>
                          </td>
                          <td className="ai-mom-generator-s93">{act.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 5: Financial Notes & Next Meeting */}
              <div className="ai-mom-generator-s94">
                <div className="ai-mom-generator-s95">
                  <h4 className="ai-mom-generator-s96">
                    💰 Financial Allocations & Ratios
                  </h4>
                  <p className="ai-mom-generator-s97">
                    {activeDoc.financialNotes}
                  </p>
                </div>
                <div className="ai-mom-generator-s95">
                  <h4 className="ai-mom-generator-s96">
                    📅 Next Scheduled Session
                  </h4>
                  <p className="ai-mom-generator-s97">
                    {activeDoc.nextMeeting}
                  </p>
                </div>
              </div>

              {/* Sign-off & Legal Signatures Block */}
              <div className="ai-mom-generator-s98">
                <div className="ai-mom-generator-s99">
                  <div>
                    <div className="ai-mom-generator-s100"></div>
                    <div className="ai-mom-generator-s101">{activeDoc.headerInfo.chairperson || 'Society Chairman'}</div>
                    <div className="ai-mom-generator-s102">Chairman, Majestique Euriska</div>
                  </div>

                  <div>
                    <div className="ai-mom-generator-s100"></div>
                    <div className="ai-mom-generator-s101">Society Secretary</div>
                    <div className="ai-mom-generator-s102">Hon. Secretary, Managing Committee</div>
                  </div>

                  <div>
                    <div className="ai-mom-generator-s100"></div>
                    <div className="ai-mom-generator-s101">Society Treasurer</div>
                    <div className="ai-mom-generator-s102">Hon. Treasurer / Finance In-Charge</div>
                  </div>
                </div>

                <div className="ai-mom-generator-s103">
                  Document officially generated on {new Date().toLocaleDateString('en-IN')} • Majestique Euriska Governance Portal
                </div>
              </div>

            </div>
          )}

          {/* ── VIEW 2: EDIT & CUSTOMIZE ── */}
          {activeView === 'edit' && (
            <div className="ai-mom-generator-s104">
              <div className="ai-mom-generator-s105">
                <h3 className="ai-mom-generator-s106">
                  ✏️ Customize & Fine-tune Generated Minutes
                </h3>
                <span className="ai-mom-generator-s107">Changes reflect immediately in Letterhead & Exports</span>
              </div>

              {/* Editable Executive Summary */}
              <div className="ai-mom-generator-s108">
                <label className="ai-mom-generator-s109">
                  Executive Summary
                </label>
                <textarea
                  rows={4}
                  value={editableMom?.executiveSummary || ''}
                  onChange={e => setEditableMom(prev => ({ ...prev, executiveSummary: e.target.value }))}
                  className="ai-mom-generator-s110"
                />
              </div>

              {/* Editable Financial Notes */}
              <div className="ai-mom-generator-s108">
                <label className="ai-mom-generator-s109">
                  Financial Allocations / Cost Sharing Notes
                </label>
                <textarea
                  rows={2}
                  value={editableMom?.financialNotes || ''}
                  onChange={e => setEditableMom(prev => ({ ...prev, financialNotes: e.target.value }))}
                  className="ai-mom-generator-s110"
                />
              </div>

              {/* Editable Next Meeting */}
              <div className="ai-mom-generator-s12">
                <label className="ai-mom-generator-s109">
                  Next Meeting Schedule
                </label>
                <input
                  type="text"
                  value={editableMom?.nextMeeting || ''}
                  onChange={e => setEditableMom(prev => ({ ...prev, nextMeeting: e.target.value }))}
                  className="ai-mom-generator-s111"
                />
              </div>

              <div className="ai-mom-generator-s112">
                <button
                  type="button"
                  onClick={() => setActiveView('preview')}
                  className="button-primary ai-mom-generator-s113"
                >
                  Apply & Return to Letterhead
                </button>
                <button
                  type="button"
                  onClick={() => setEditableMom(JSON.parse(JSON.stringify(generatedMom)))}
                  className="button-secondary ai-mom-generator-s113"
                >
                  Reset Edits to Original AI
                </button>
              </div>
            </div>
          )}

          {/* ── VIEW 3: ACTION REGISTER ── */}
          {activeView === 'actions' && (
            <div className="ai-mom-generator-s104">
              <div className="ai-mom-generator-s114">
                <h3 className="ai-mom-generator-s106">
                  📋 Action Item Accountability & Follow-up
                </h3>
                <button
                  type="button"
                  data-testid="agent-autoassign-actions-btn"
                  onClick={handleSmartAutoAssign}
                  className="button-secondary ai-mom-generator-s115"
                  title="Intelligently assign committee members and technicians based on task keywords"
                >
                  <Zap size={14} color="#2563eb" />
                  🎯 Auto-Assign Owners via AI
                </button>
              </div>
              <div className="ai-mom-generator-s14">
                {activeDoc.actionItems?.map((act, idx) => (
                  <div key={idx} className="ai-mom-generator-s116">
                    <div className="ai-mom-generator-s117">
                      <span className="ai-mom-generator-s118">
                        {act.id || `ACT-${idx + 1}`}
                      </span>
                      <span className="ai-mom-generator-s119" style={{ background: act.priority === 'HIGH' ? '#fee2e2' : '#fef3c7', color: act.priority === 'HIGH' ? '#dc2626' : '#d97706' }}>
                        {act.priority} PRIORITY
                      </span>
                    </div>
                    <h4 className="ai-mom-generator-s120">
                      {act.task}
                    </h4>
                    <div className="ai-mom-generator-s121">
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
            <div data-testid="meeting-history-templates-view" className="ai-mom-generator-s122">
              <div className="ai-mom-generator-s123">
                <div>
                  <div className="ai-mom-generator-s124">
                    <FolderOpen size={12} />
                    Society Repository & Templates
                  </div>
                  <h3 className="ai-mom-generator-s125">
                    🕒 Meeting History & Standard Society Templates
                  </h3>
                  <p className="ai-mom-generator-s126">
                    Load standardized society templates or restore previous meeting minutes and drafts.
                  </p>
                </div>

                <div className="ai-mom-generator-s49">
                  {generatedMom && (
                    <button
                      type="button"
                      onClick={() => setActiveView('preview')}
                      className="button-secondary ai-mom-generator-s127"
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
                    className="button-primary ai-mom-generator-s127"
                  >
                    ✍️ Draft New Minutes
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="ai-mom-generator-s128">
                <button
                  type="button"
                  onClick={() => setHistoryFilter('all')}
                  className="ai-mom-generator-s129" style={{ borderColor: historyFilter === 'all' ? '#0f172a' : '#cbd5e1', background: historyFilter === 'all' ? '#0f172a' : '#ffffff', color: historyFilter === 'all' ? '#ffffff' : '#475569' }}
                >
                  All ({OFFICIAL_MOM_TEMPLATES.length + savedMoms.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter('official')}
                  className="ai-mom-generator-s129" style={{ borderColor: historyFilter === 'official' ? '#2563eb' : '#cbd5e1', background: historyFilter === 'official' ? '#eff6ff' : '#ffffff', color: historyFilter === 'official' ? '#1d4ed8' : '#475569' }}
                >
                  🏛️ Standard Society Templates ({OFFICIAL_MOM_TEMPLATES.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter('wingA')}
                  className="ai-mom-generator-s129" style={{ borderColor: historyFilter === 'wingA' ? '#059669' : '#cbd5e1', background: historyFilter === 'wingA' ? '#ecfdf5' : '#ffffff', color: historyFilter === 'wingA' ? '#047857' : '#475569' }}
                >
                  🏢 Wing 'A' Templates
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter('common')}
                  className="ai-mom-generator-s129" style={{ borderColor: historyFilter === 'common' ? '#2563eb' : '#cbd5e1', background: historyFilter === 'common' ? '#eff6ff' : '#ffffff', color: historyFilter === 'common' ? '#1d4ed8' : '#475569' }}
                >
                  🌐 Common Infrastructure
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter('saved')}
                  className="ai-mom-generator-s129" style={{ borderColor: historyFilter === 'saved' ? '#d97706' : '#cbd5e1', background: historyFilter === 'saved' ? '#fffbeb' : '#ffffff', color: historyFilter === 'saved' ? '#b45309' : '#475569' }}
                >
                  💾 Saved History ({savedMoms.length})
                </button>
              </div>

              {/* 1. Official Society Templates Grid */}
              {(historyFilter === 'all' || historyFilter === 'official' || historyFilter === 'wingA' || historyFilter === 'common') && (
                <div className="ai-mom-generator-s130">
                  <div className="ai-mom-generator-s131">
                    <h4 className="ai-mom-generator-s132">
                      🏛️ Official Standard Society Templates
                    </h4>
                    <span className="ai-mom-generator-s133">
                      Pre-verified Byelaw Formats
                    </span>
                  </div>

                  <div className="ai-mom-generator-s134">
                    {filteredOfficialTemplates.map(tmpl => (
                      <div
                        key={tmpl.id}
                        data-testid={`template-card-${tmpl.id}`}
                        className="ai-mom-generator-s135" style={{ border: tmpl.scope === 'A_BUILDING' ? '1.5px solid #a7f3d0' : '1.5px solid #bfdbfe', background: tmpl.scope === 'A_BUILDING' ? '#f0fdf4' : '#eff6ff' }}
                      >
                        <div>
                          <div className="ai-mom-generator-s136">
                            <span className="ai-mom-generator-s137" style={{ background: tmpl.scope === 'A_BUILDING' ? '#059669' : '#2563eb' }}>
                              {tmpl.badgeText}
                            </span>
                            <span className="ai-mom-generator-s138">
                              {tmpl.category}
                            </span>
                          </div>

                          <h5 className="ai-mom-generator-s139">
                            {tmpl.title}
                          </h5>
                          <p className="ai-mom-generator-s140">
                            {tmpl.description}
                          </p>

                          <div className="ai-mom-generator-s141">
                            <span className="ai-mom-generator-s142">
                              👥 {tmpl.headerInfo.attendees.length} Attendees
                            </span>
                            <span className="ai-mom-generator-s142">
                              📋 {tmpl.sampleMOM.agendaItems.length} Agenda Items
                            </span>
                            <span className="ai-mom-generator-s142">
                              ⚖️ {tmpl.sampleMOM.resolutions.length} Resolutions
                            </span>
                          </div>
                        </div>

                        <div className="ai-mom-generator-s143">
                          <button
                            type="button"
                            onClick={() => handleRestoreFromHistory(tmpl)}
                            className="ai-mom-generator-s144" style={{ background: tmpl.scope === 'A_BUILDING' ? '#059669' : '#2563eb' }}
                          >
                            <ExternalLink size={13} />
                            Load Template ↗
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLoadTemplateIntoForm(tmpl)}
                            title="Load notes & attendees into the editor form"
                            className="ai-mom-generator-s145"
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
                  <div className="ai-mom-generator-s131">
                    <h4 className="ai-mom-generator-s132">
                      💾 Previously Saved Meeting Minutes & Records ({filteredSavedMoms.length})
                    </h4>
                  </div>

                  {filteredSavedMoms.length === 0 ? (
                    <div className="ai-mom-generator-s146">
                      <p className="ai-mom-generator-s147">No saved custom meeting drafts match your selection.</p>
                      <p className="ai-mom-generator-s148">Whenever you generate or click "Save into Society Records", your drafts appear here for instant retrieval.</p>
                    </div>
                  ) : (
                    <div className="ai-mom-generator-s149">
                      {filteredSavedMoms.map((m, idx) => (
                        <div
                          key={m.id || idx}
                          onClick={() => handleRestoreFromHistory(m)}
                          className="ai-mom-generator-s150"
                        >
                          <div>
                            <div className="ai-mom-generator-s151">
                              <span className="ai-mom-generator-s152" style={{ background: m.scope === 'A_BUILDING' ? '#059669' : '#2563eb' }}>
                                {m.scope === 'A_BUILDING' ? "BUILDING 'A'" : 'COMMON INFRA'}
                              </span>
                              <strong className="ai-mom-generator-s153">{m.title}</strong>
                            </div>
                            <div className="ai-mom-generator-s107">
                              Date: {m.headerInfo?.meetingDate || 'N/A'} • {m.actionItems?.length || 0} Action Items • {m.resolutions?.length || 0} Resolutions
                            </div>
                          </div>

                          <div className="ai-mom-generator-s154">
                            <span className="ai-mom-generator-s155">Restore & View ↗</span>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteHistory(m.id, e)}
                              title="Delete from history"
                              className="ai-mom-generator-s156"
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
