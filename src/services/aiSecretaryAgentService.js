/**
 * AI Secretary Agent Service for Majestique Euriska CHS
 * 
 * Provides autonomous capabilities:
 * 1. Intelligent Attendee Scanner: scans raw notes/transcripts for flat numbers, names, and roles
 * 2. Statutory Quorum Verification: checks meeting validity under Maharashtra Co-operative Societies Act
 * 3. Smart Action Item Assignment: maps resolutions to committee members and designated roles
 * 4. WhatsApp / Broadcast Notice Generator: formats concise summary for resident/committee groups
 * 5. Voice Dictation Helper: handles speech-to-text integration
 */

import { COMMITTEE_MEMBERS, getCommitteeMembersByScope } from '../data/committeeMembersData.js';
import { SOCIETY_INFO } from '../data/societyConfig.js';
import { GoogleGenAI } from '@google/genai';

/**
 * Scans raw meeting notes or transcripts and detects attending committee members and external guests.
 * Matches:
 * - Flat Numbers: e.g. "A-204", "A204", "flat 204", "306", "C-306"
 * - Member Names: e.g. "Neha", "Sandeep", "Rohan", "Sachin"
 * - Designated Roles: e.g. "Estate Manager", "Secretary", "Treasurer", "Auditor", "Technician"
 * 
 * @param {string} rawNotes - The raw discussion notes or transcript
 * @param {Array} committeeRoster - List of committee member objects (defaults to COMMITTEE_MEMBERS)
 * @returns {Object} { detectedMemberIds: string[], detectedRoles: string[], allMatchedLabels: string[] }
 */
export function scanNotesForAttendees(rawNotes = '', committeeRoster = COMMITTEE_MEMBERS) {
  if (!rawNotes || typeof rawNotes !== 'string') {
    return { detectedMemberIds: [], detectedRoles: [], allMatchedLabels: [], totalDetected: 0 };
  }

  const textLower = rawNotes.toLowerCase();
  const detectedIds = new Set();
  const detectedRoles = new Set();

  // 1. Scan Committee Roster
  committeeRoster.forEach(member => {
    // Check flat number (e.g. "a-204", "a204", "204")
    const flatNoClean = member.flatNo.toLowerCase(); // "a-204"
    const flatNoNumeric = member.flatNo.replace(/[^0-9]/g, ''); // "204"
    const flatNoCompact = member.flatNo.replace(/-/g, '').toLowerCase(); // "a204"
    const memberName = member.name.toLowerCase(); // "neha"

    // Regex boundary checks for name
    const nameRegex = new RegExp(`\\b${memberName}\\b`, 'i');
    const flatRegex = new RegExp(`\\b${flatNoClean}\\b|\\b${flatNoCompact}\\b`, 'i');
    const flatNumRegex = new RegExp(`(?:flat|unit|flt)?\\s*[-:#]?\\s*\\b${flatNoNumeric}\\b`, 'i');

    if (nameRegex.test(rawNotes) || flatRegex.test(rawNotes) || (flatNoNumeric && flatNumRegex.test(rawNotes))) {
      detectedIds.add(member.id);
    }
  });

  // 2. Scan Common Society Executive Roles
  const standardRoles = [
    { label: 'Estate Manager', pattern: /\b(estate\s*manager|manager|patil)\b/i },
    { label: 'Society Chairman', pattern: /\b(chairman|chairperson|presided\s*by)\b/i },
    { label: 'Society Secretary', pattern: /\b(secretary|hon\.?\s*secretary)\b/i },
    { label: 'Society Treasurer', pattern: /\b(treasurer|cashier|finance\s*lead)\b/i },
    { label: 'Otis Lift Technician', pattern: /\b(otis(\s*tech|\s*engineer|\s*technician)?)\b/i },
    { label: 'Kirloskar DG Engineer', pattern: /\b(kirloskar(\s*tech|\s*care|\s*engineer)?)\b/i },
    { label: 'Apex Fire Safety Officer', pattern: /\b(apex|fire\s*officer|fire\s*agency)\b/i },
    { label: 'Statutory Auditor', pattern: /\b(auditor|chartered\s*accountant|ca)\b/i }
  ];

  standardRoles.forEach(({ label, pattern }) => {
    if (pattern.test(rawNotes)) {
      detectedRoles.add(label);
    }
  });

  const detectedMemberIds = Array.from(detectedIds);
  const detectedRolesList = Array.from(detectedRoles);

  // Friendly display labels
  const allMatchedLabels = [
    ...detectedMemberIds.map(id => {
      const match = committeeRoster.find(m => m.id === id);
      return match ? `${match.flatNo} (${match.name})` : id;
    }),
    ...detectedRolesList
  ];

  return {
    detectedMemberIds,
    detectedRoles: detectedRolesList,
    allMatchedLabels,
    totalDetected: detectedMemberIds.length + detectedRolesList.length
  };
}

/**
 * Calculates statutory quorum validity under bye-laws.
 * Quorum typically requires >= 50% of the elected committee members.
 * 
 * @param {Array} selectedAttendees - Array of selected attendee IDs/labels
 * @param {string} scope - 'A_BUILDING' or 'COMMON'
 * @param {Array} committeeRoster - Defaults to COMMITTEE_MEMBERS
 * @returns {Object} Quorum calculation details
 */
export function calculateQuorum(selectedAttendees = [], scope = 'A_BUILDING', committeeRoster = COMMITTEE_MEMBERS) {
  const isABuilding = scope === 'A_BUILDING';
  const eligibleRoster = getCommitteeMembersByScope(scope);
  const totalEligible = eligibleRoster.length; // 10 for Wing A, 26 for Common

  // Count how many eligible committee members are selected
  const eligibleIds = new Set(eligibleRoster.map(m => m.id));
  const committeeAttendeesCount = selectedAttendees.filter(att => eligibleIds.has(att) || eligibleRoster.some(m => m.formatted === att || m.label === att)).length;

  const quorumThreshold = Math.ceil(totalEligible * 0.5); // 5 for Wing A, 13 for Common
  const isQuorumMet = committeeAttendeesCount >= quorumThreshold;
  const percentage = totalEligible > 0 ? Math.round((committeeAttendeesCount / totalEligible) * 100) : 0;

  return {
    isQuorumMet,
    totalEligible,
    presentCount: committeeAttendeesCount,
    quorumThreshold,
    percentage,
    scopeLabel: isABuilding ? "Wing 'A' Committee (10 Members)" : "Joint Common Committee (26 Members)",
    badgeColor: isQuorumMet ? '#059669' : '#d97706',
    statusText: isQuorumMet 
      ? `✅ Quorum Met: ${committeeAttendeesCount}/${totalEligible} Members Present (${percentage}%)` 
      : `⚠️ Quorum Short: ${committeeAttendeesCount}/${totalEligible} Present (Need minimum ${quorumThreshold} for legal validity)`
  };
}

/**
 * Automatically assigns action items to attendees or designated executives based on subject matter.
 * 
 * @param {Array} actionItems - List of action items from MOM
 * @param {Array} selectedAttendees - List of present members
 * @returns {Array} Updated action items with intelligent assignee mapping
 */
export function autoAssignActionItems(actionItems = [], selectedAttendees = []) {
  if (!Array.isArray(actionItems)) return [];

  return actionItems.map(item => {
    // If already specifically assigned to someone other than default, retain
    if (item.assignedTo && !item.assignedTo.includes('Managing Committee') && item.assignedTo !== 'Unassigned') {
      return item;
    }

    const text = `${item.task || ''} ${item.category || ''}`.toLowerCase();
    let smartAssignee = 'Estate Manager';

    if (text.includes('lift') || text.includes('otis') || text.includes('elevator')) {
      smartAssignee = 'Estate Manager / Otis Technician';
    } else if (text.includes('dg') || text.includes('kirloskar') || text.includes('generator') || text.includes('diesel')) {
      smartAssignee = 'Estate Manager & DG Incharge';
    } else if (text.includes('water') || text.includes('tank') || text.includes('tanker') || text.includes('plumber')) {
      // Check if A-Wing water lead is present
      smartAssignee = selectedAttendees.find(a => a.includes('A-501') || a.includes('Prakash')) 
        ? 'Mr. Prakash (A-501) & Society Plumber' 
        : 'Estate Manager & Society Plumber';
    } else if (text.includes('fire') || text.includes('pump') || text.includes('drill')) {
      smartAssignee = 'Safety Incharge & Apex Fire Services';
    } else if (text.includes('maintenance') || text.includes('bill') || text.includes('collection') || text.includes('dues') || text.includes('fund') || text.includes('cheque')) {
      smartAssignee = 'Society Treasurer & Hon. Secretary';
    } else if (text.includes('parking') || text.includes('slot') || text.includes('vehicle') || text.includes('park+')) {
      smartAssignee = 'Parking Coordinator & Estate Manager';
    } else if (text.includes('housekeeping') || text.includes('cleaning') || text.includes('garbage')) {
      smartAssignee = 'Housekeeping Supervisor & Estate Manager';
    } else if (selectedAttendees.length > 0) {
      smartAssignee = selectedAttendees[0];
    }

    return {
      ...item,
      assignedTo: smartAssignee
    };
  });
}

/**
 * Generates an executive WhatsApp / Community circular from the finalized MOM.
 * 
 * @param {Object} momDoc - The completed MOM document
 * @returns {string} Formatted text suitable for WhatsApp Broadcast
 */
export function generateWhatsAppNotice(momDoc) {
  if (!momDoc || !momDoc.headerInfo) return '';

  const { headerInfo, resolutions = [], actionItems = [], scope } = momDoc;
  const isABuilding = scope === 'A_BUILDING';

  const titleHeader = isABuilding 
    ? `🏢 *MAJESTIQUE EURISKA - WING 'A' COMMITTEE UPDATE*` 
    : `🌐 *MAJESTIQUE EURISKA - JOINT COMMON INFRASTRUCTURE UPDATE*`;

  const dateStr = headerInfo.meetingDate || new Date().toISOString().split('T')[0];
  const attendeesList = Array.isArray(headerInfo.attendees) ? headerInfo.attendees.join(', ') : (headerInfo.attendees || 'Committee Members');

  let message = `${titleHeader}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📅 *Date:* ${dateStr} | ⏰ *Time:* ${headerInfo.meetingTime || '11:00 AM'}\n`;
  message += `📍 *Venue:* ${headerInfo.venue || 'Society Office'}\n`;
  message += `👥 *Present:* ${attendeesList}\n\n`;

  message += `📌 *EXECUTIVE SUMMARY:*\n`;
  message += `${momDoc.executiveSummary || 'Key society operational points reviewed and approved.'}\n\n`;

  if (resolutions.length > 0) {
    message += `⚖️ *KEY RESOLUTIONS APPROVED:*\n`;
    resolutions.slice(0, 4).forEach((res, i) => {
      message += `${i + 1}. *[${res.resNo}] ${res.subject}*\n   ↳ ${res.verdict || 'Approved'}: ${res.text ? res.text.substring(0, 140) + '...' : ''}\n`;
    });
    message += `\n`;
  }

  if (actionItems.length > 0) {
    message += `📋 *ACTIONABLE TASKS & DEADLINES:*\n`;
    actionItems.slice(0, 4).forEach((act, i) => {
      message += `• ${act.task} ➔ *Assigned to:* ${act.assignedTo} (Due: ${act.dueDate || 'Immediate'})\n`;
    });
    message += `\n`;
  }

  if (momDoc.financialNotes) {
    message += `💰 *FINANCIAL DIRECTIVES:*\n${momDoc.financialNotes}\n\n`;
  }

  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `ℹ️ _Official minutes logged in Majestique Euriska Portal. For questions, contact the Managing Committee._`;

  return message;
}
