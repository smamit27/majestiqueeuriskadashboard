import { GoogleGenAI } from '@google/genai';
import { SOCIETY_INFO, SOCIETY_FLATS_DISTRIBUTION } from '../data/societyConfig.js';

function getAiClient() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || import.meta.env.MODE === 'test') return null;
  try {
    return new GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI client:', err);
    return null;
  }
}

/**
 * Generates Minutes of Meeting (MOM) for 'A Building' or 'Common' infrastructure.
 * Uses Gemini AI with smart offline heuristic fallback.
 */
export async function generateMeetingMOM({
  rawNotes = '',
  scope = 'A_BUILDING', // 'A_BUILDING' | 'COMMON'
  meetingDate = new Date().toISOString().split('T')[0],
  meetingTime = '11:00 AM',
  meetingType = 'Managing Committee Meeting',
  venue = '',
  chairperson = '',
  attendees = ''
}) {
  const isABuilding = scope === 'A_BUILDING';
  const defaultVenue = venue || (isABuilding ? "Society Office / Wing 'A' Lobby" : "Society Clubhouse / Common Premises");

  const client = getAiClient();
  // Attempt AI Generation via Gemini if client is ready
  if (client && rawNotes.trim().length > 10) {
    try {
      const momData = await queryGeminiForMom(client, {
        rawNotes,
        scope,
        meetingDate,
        meetingTime,
        meetingType,
        venue: defaultVenue,
        chairperson,
        attendees
      });
      if (momData && momData.executiveSummary) {
        return {
          ...momData,
          aiModelUsed: 'Google Gemini 2.5 Flash'
        };
      }
    } catch (error) {
      console.warn('Gemini MOM generation failed, using built-in intelligent society parser:', error);
    }
  }

  // Fallback / Built-in Intelligent Parser
  return generateHeuristicMom({
    rawNotes,
    scope,
    meetingDate,
    meetingTime,
    meetingType,
    venue: defaultVenue,
    chairperson,
    attendees
  });
}

/**
 * Queries Gemini 2.5 Flash with strict JSON schema instructions.
 */
async function queryGeminiForMom(client, {
  rawNotes,
  scope,
  meetingDate,
  meetingTime,
  meetingType,
  venue,
  chairperson,
  attendees
}) {
  const isABuilding = scope === 'A_BUILDING';

  const systemInstruction = `You are the Official Legal & Operational Secretary AI for Majestique Euriska Co-operative Housing Society Ltd., Pune.
Your task is to take raw, unedited meeting notes and draft an immaculate, formal Minutes of Meeting (MOM).

CRITICAL SCOPE CONTEXT:
${isABuilding ? `
- TARGET SCOPE: 'A' BUILDING ONLY (87 Flats, 11 Floors).
- Legal Entity: ${SOCIETY_INFO.name} (Reg No: ${SOCIETY_INFO.regNo}).
- Focus on: Wing A internal affairs, 2 passenger lifts, lobby cleanliness, Wing A terrace waterproofing, A-Wing dedicated parking slots (A-101 to A-1108), DG battery & machine backup for Wing A, internal housekeeping staff (7 workers), and Wing A maintenance recovery.
- Resolution numbering format: RES-A/${new Date(meetingDate).getFullYear()}/01, 02...
` : `
- TARGET SCOPE: COMMON SOCIETY / ALL WINGS INFRASTRUCTURE (Wings A, B, C & 14 Commercial Shops, 231 Total Units).
- Joint / Apex Entity: Majestique Euriska Apex Infrastructure & Joint Committee.
- Share Ratios: Wing A (37.66%, 87 flats), Wing B (41.56%, 96 flats), Wing C (20.78%, 48 flats).
- Focus on: Main Entrance Security Gate, Sewage Treatment Plant (STP), Main Water Tanks (5,39,400 Liters Capacity) & Tanker supply, Fire Pump & main hydrants, Swimming Pool & Clubhouse, Eisha Builder pending handover items, shared TOI electricity bills, and inter-wing shared cost allocations.
- Resolution numbering format: RES-COM/${new Date(meetingDate).getFullYear()}/01, 02...
`}

OUTPUT REQUIREMENT:
Return ONLY a valid JSON object (no markdown code fence, no surrounding text).
The JSON MUST follow this exact structure:
{
  "title": "${meetingType} - ${isABuilding ? 'Wing A Society Affairs' : 'Common Society Infrastructure'}",
  "scope": "${scope}",
  "executiveSummary": "A concise 2-3 paragraph professional overview of discussions, priorities, and key outcomes.",
  "agendaItems": [
    {
      "itemNo": "1",
      "title": "Agenda heading",
      "category": "Maintenance / Security / Finance / Operations",
      "discussion": "Detailed description of what members discussed and deliberated.",
      "decision": "Concrete decision agreed upon by the committee."
    }
  ],
  "resolutions": [
    {
      "resNo": "${isABuilding ? 'RES-A' : 'RES-COM'}/${new Date(meetingDate).getFullYear()}/01",
      "subject": "Resolution Subject",
      "proposer": "Name or Title",
      "seconder": "Name or Title",
      "verdict": "Passed Unanimously",
      "text": "Detailed resolution text beginning with 'RESOLVED THAT...'"
    }
  ],
  "actionItems": [
    {
      "id": "ACT-1",
      "task": "Action description",
      "assignedTo": "Responsible person / Committee member / Vendor",
      "dueDate": "YYYY-MM-DD or timeframe",
      "priority": "HIGH or MEDIUM or LOW",
      "category": "Maintenance / Security / Finance / Operations",
      "status": "OPEN"
    }
  ],
  "financialNotes": "Any financial allocations, budget approvals, or cost-sharing details mentioned.",
  "nextMeeting": "Scheduled date or timeframe for the follow-up meeting."
}`;

  const prompt = `Meeting Metadata:
- Date: ${meetingDate}
- Time: ${meetingTime}
- Meeting Type: ${meetingType}
- Venue: ${venue}
- Chairperson / Presided By: ${chairperson}
- Attendees: ${attendees || 'Managing Committee members, Wing representatives, and residents'}

Raw Meeting Notes / Transcript:
"""
${rawNotes}
"""

Analyze these raw notes, extract all topics, decisions, action points, and resolutions, and output the formal JSON document.`;

  const chat = client.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction,
      temperature: 0.2,
      responseMimeType: 'application/json'
    }
  });

  const response = await chat.sendMessage({ message: prompt });
  const rawText = response.text?.trim() || '';

  // Parse JSON cleanly
  const cleaned = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(cleaned);

  return enrichMomPayload(parsed, {
    scope,
    meetingDate,
    meetingTime,
    meetingType,
    venue,
    chairperson,
    attendees,
    rawNotes
  });
}

/**
 * Intelligent Heuristic Rule-Based Parser.
 * Ensures the app works 100% reliably even when offline or without an active API key.
 */
function generateHeuristicMom({
  rawNotes,
  scope,
  meetingDate,
  meetingTime,
  meetingType,
  venue,
  chairperson,
  attendees
}) {
  const isABuilding = scope === 'A_BUILDING';
  const year = new Date(meetingDate).getFullYear() || 2026;

  // Split lines and identify topics
  const lines = rawNotes
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const detectedTopics = [];
  const actionList = [];
  const resolutionList = [];
  let currentTopic = null;

  // Common keywords to detect categories
  const categories = {
    Water: ['water', 'tanker', 'tank', 'borewell', 'valve', 'pump', 'plumbing'],
    Security: ['security', 'guard', 'gate', 'cctv', 'visitor', 'patrolling', 'boom barrier', 'park+'],
    Maintenance: ['lift', 'dg', 'cleaning', 'housekeeping', 'paint', 'leakage', 'terrace', 'amc', 'repair', 'light'],
    Finance: ['dues', 'audit', 'cheque', 'payment', 'vendor', 'invoice', 'expense', 'fund', 'bank', 'cost'],
    Legal: ['builder', 'eisha', 'handover', 'conveyance', 'registration', 'bylaws', 'dispute']
  };

  const findCategory = (text) => {
    const lower = text.toLowerCase();
    for (const [cat, words] of Object.entries(categories)) {
      if (words.some(w => lower.includes(w))) return cat;
    }
    return isABuilding ? 'Wing A Operations' : 'Common Infrastructure';
  };

  lines.forEach((line, idx) => {
    // Strip bullet markers
    const cleanLine = line.replace(/^[-*•\d.)\]\s]+/, '').trim();
    if (!cleanLine) return;

    const cat = findCategory(cleanLine);

    // Identify if line indicates an action
    const isAction = /action|follow\s*up|responsible|assigned|owner|vendor\s+to|check\s+with|due|deadline/i.test(cleanLine);
    // Identify if line indicates a decision or resolution
    const isDecision = /decided|agreed|approved|resolved|passed|finalized|confirmed/i.test(cleanLine);

    if (isAction) {
      // Try to extract assignee if present
      let assignedTo = 'Estate Manager';
      if (/secretary/i.test(cleanLine)) assignedTo = 'Society Secretary';
      else if (/treasurer|finance/i.test(cleanLine)) assignedTo = 'Society Treasurer';
      else if (/chairman|president/i.test(cleanLine)) assignedTo = chairperson || 'Society Chairman';
      else if (/vendor|contractor|technician/i.test(cleanLine)) assignedTo = 'Assigned Vendor / Contractor';

      actionList.push({
        id: `ACT-${actionList.length + 1}`,
        task: cleanLine,
        assignedTo,
        dueDate: new Date(Date.now() + (actionList.length + 1) * 7 * 86400000).toISOString().split('T')[0],
        priority: actionList.length % 2 === 0 ? 'HIGH' : 'MEDIUM',
        category: cat,
        status: 'OPEN'
      });
    }

    if (isDecision) {
      const resPrefix = isABuilding ? 'RES-A' : 'RES-COM';
      const num = String(resolutionList.length + 1).padStart(2, '0');
      resolutionList.push({
        resNo: `${resPrefix}/${year}/${num}`,
        subject: cleanLine.substring(0, 60) + (cleanLine.length > 60 ? '...' : ''),
        proposer: chairperson || 'Society Chairman',
        seconder: 'Committee Member',
        verdict: 'Passed Unanimously',
        text: `RESOLVED THAT ${cleanLine}. The committee hereby authorizes the implementation team to proceed in strict compliance with society bylaws.`
      });
    }

    // Group into agenda items
    if (!currentTopic || (currentTopic.discussion.split('.').length >= 3)) {
      currentTopic = {
        itemNo: String(detectedTopics.length + 1),
        title: cleanLine.length > 50 ? `${cat}: ${cleanLine.substring(0, 47)}...` : `${cat}: ${cleanLine}`,
        category: cat,
        discussion: cleanLine,
        decision: isDecision ? cleanLine : `The committee noted the observation regarding ${cleanLine} and instructed relevant stakeholders to initiate required follow-ups.`
      };
      detectedTopics.push(currentTopic);
    } else {
      currentTopic.discussion += ` Furthermore, ${cleanLine}.`;
    }
  });

  // Ensure default items exist if notes were sparse
  if (detectedTopics.length === 0) {
    detectedTopics.push({
      itemNo: '1',
      title: isABuilding ? 'Wing A Maintenance & Resident Services Review' : 'Common Infrastructure & Inter-Wing Operations',
      category: isABuilding ? 'Wing A Operations' : 'Shared Infrastructure',
      discussion: rawNotes || 'The committee convened to review ongoing operations, vendor deliverables, and resident submissions.',
      decision: 'Approved operational action plan as outlined in the deliberations.'
    });
  }

  if (resolutionList.length === 0) {
    const resPrefix = isABuilding ? 'RES-A' : 'RES-COM';
    resolutionList.push({
      resNo: `${resPrefix}/${year}/01`,
      subject: isABuilding ? 'Approval of Wing A Operational Directives' : 'Joint Resolution on Common Amenities & Vendor Deliverables',
      proposer: chairperson || 'Society Chairman',
      seconder: 'Managing Committee Member',
      verdict: 'Passed Unanimously',
      text: `RESOLVED THAT the Managing Committee approves the operational directives documented in this meeting. All concerned committees and vendors are instructed to execute respective deliverables within stipulated timelines.`
    });
  }

  if (actionList.length === 0) {
    actionList.push({
      id: 'ACT-1',
      task: isABuilding ? 'Circulate Wing A Meeting Summary to all 87 flat owners' : 'Share Common Infrastructure Minutes with Wings A, B, C & Shop Owners',
      assignedTo: 'Society Secretary',
      dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      priority: 'HIGH',
      category: 'Governance',
      status: 'OPEN'
    });
  }

  const executiveSummary = isABuilding
    ? `The Managing Committee of ${SOCIETY_INFO.name} held a formal meeting on ${meetingDate} at ${venue} to address matters concerning Wing 'A' (87 flats / 11 floors). Key deliberations centered around resident safety, lift servicing, DG backup readiness, and internal housekeeping standards. The committee reached unanimous consensus on prioritized agenda items and assigned clear action timelines to ensure uninterrupted operations and high living standards for Wing 'A' residents.`
    : `A joint coordination meeting of the Majestique Euriska Common Infrastructure Committee was held on ${meetingDate} at ${venue}. The session addressed shared assets and cross-wing services benefiting all 231 units across Wings A (37.66%), B (41.56%), C (20.78%), and the 14 commercial establishments. Critical discussions included Main Security Gate surveillance, Sewage Treatment Plant (STP) maintenance, 5.39 Lakh Liter water reservoir management, and pending builder handover deliverables with Eisha Properties. Collaborative action paths were approved with equitable inter-wing responsibility.`;

  const payload = {
    title: `${meetingType} - ${isABuilding ? "Wing 'A' Affairs" : 'Common Society Infrastructure'}`,
    scope,
    executiveSummary,
    agendaItems: detectedTopics,
    resolutions: resolutionList,
    actionItems: actionList,
    financialNotes: isABuilding 
      ? 'All expenditures for Wing A services are to be charged against the Wing A Maintenance Reserve Account in accordance with approved AGM budgets.'
      : 'Common costs are to be shared according to established society ratios: Wing A: 37.66%, Wing B: 41.56%, Wing C: 20.78%, with commercial shops billed per agreement.',
    nextMeeting: 'Next monthly review scheduled within 30 days or as convened by the Secretary.'
  };

  return enrichMomPayload(payload, {
    scope,
    meetingDate,
    meetingTime,
    meetingType,
    venue,
    chairperson,
    attendees,
    rawNotes,
    aiModelUsed: 'Society Intelligent NLP Engine (Built-in)'
  });
}

/**
 * Enriches the raw MOM object with legal headers, scope badges, attendees list, and helper metadata.
 */
function enrichMomPayload(data, context) {
  const isABuilding = context.scope === 'A_BUILDING';

  const attendeeList = context.attendees
    ? context.attendees.split(/[,;\n]+/).map(a => a.trim()).filter(Boolean)
    : [
        context.chairperson || 'Society Chairman',
        'Society Secretary',
        'Society Treasurer',
        isABuilding ? 'Wing A Committee Representatives' : 'Representatives of Wings A, B, C & Shops',
        'Estate Manager'
      ];

  return {
    id: `mom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: data.title || `${context.meetingType} - ${isABuilding ? "Wing 'A'" : 'Common Infrastructure'}`,
    scope: context.scope,
    scopeLabel: isABuilding ? "Majestique Euriska 'A' Building CHS Ltd." : "Majestique Euriska Apex / Joint Common Infrastructure",
    headerInfo: {
      societyName: isABuilding 
        ? SOCIETY_INFO.name 
        : "Majestique Euriska Joint Infrastructure & Common Amenities Committee",
      regNo: isABuilding ? SOCIETY_INFO.regNoShort : "Apex Committee (Wings A, B, C & Commercial Shops)",
      address: SOCIETY_INFO.address,
      fullLegalHeader: SOCIETY_INFO.fullLegalHeader,
      meetingTitle: data.title || `${context.meetingType}`,
      meetingType: context.meetingType,
      meetingDate: context.meetingDate,
      meetingTime: context.meetingTime,
      venue: context.venue,
      chairperson: context.chairperson,
      attendees: attendeeList,
      scopeBadge: isABuilding ? "🏢 WING 'A' DEDICATED MATTERS (87 FLATS)" : "🌐 COMMON INFRASTRUCTURE & SHARED ASSETS (WINGS A, B, C + 14 SHOPS)",
      unitCoverage: isABuilding ? "87 Residential Units" : "231 Total Units (A: 87, B: 96, C: 48, Shops: 14)"
    },
    executiveSummary: data.executiveSummary || '',
    agendaItems: data.agendaItems || [],
    resolutions: data.resolutions || [],
    actionItems: data.actionItems || [],
    financialNotes: data.financialNotes || '',
    nextMeeting: data.nextMeeting || 'Within 30 calendar days.',
    rawNotes: context.rawNotes,
    aiModelUsed: context.aiModelUsed || 'Google Gemini 2.5 Flash',
    generatedAt: new Date().toISOString()
  };
}
