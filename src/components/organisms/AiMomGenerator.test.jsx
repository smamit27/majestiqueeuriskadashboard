import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import AiMomGenerator from './AiMomGenerator.jsx';
import { generateMeetingMOM } from '../../services/aiMomService.js';

// Mock Firebase dependencies
vi.mock('../../firebase.js', () => ({
  db: {},
  isFirebaseConfigured: false,
  ensureFirebaseSession: vi.fn().mockResolvedValue(null),
}));

// Mock Google GenAI to avoid network latency and 429 rate limit
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    chats: {
      create: vi.fn().mockImplementation(({ systemInstruction }) => ({
        sendMessage: vi.fn().mockImplementation(async () => {
          const isCommon = systemInstruction?.includes('COMMON INFRASTRUCTURE');
          return {
            text: JSON.stringify({
              title: isCommon ? "Joint Common Infrastructure Meeting" : "Wing 'A' Committee Meeting",
              scope: isCommon ? "COMMON" : "A_BUILDING",
              executiveSummary: isCommon 
                ? "The joint committee reviewed common campus infrastructure including STP, Security, and water reservoir."
                : "The committee reviewed Wing 'A' affairs including lifts, terrace waterproofing, and housekeeping.",
              agendaItems: [
                {
                  itemNo: "1",
                  title: isCommon ? "STP & Water Operations" : "Lift 1 Servicing",
                  category: isCommon ? "Common Infrastructure" : "Maintenance",
                  discussion: "Detailed discussion held.",
                  decision: "Approved directives."
                }
              ],
              resolutions: [
                {
                  resNo: isCommon ? "RES-COM/2026/01" : "RES-A/2026/01",
                  subject: isCommon ? "STP Sludge Clearance" : "Lift Repair Approval",
                  proposer: "Mr. Rohan (Chairman)",
                  seconder: "Managing Committee Member",
                  verdict: "Passed Unanimously",
                  text: "RESOLVED THAT the operational action plan is hereby approved."
                }
              ],
              actionItems: [
                {
                  id: "ACT-1",
                  task: isCommon ? "Schedule STP Sludge Tanker" : "Check Otis sensor calibration",
                  assignedTo: "Estate Manager",
                  dueDate: "2026-11-01",
                  priority: "HIGH",
                  category: "Operations",
                  status: "OPEN"
                }
              ],
              financialNotes: "Common costs split: Wing A (37.66%), Wing B (41.56%), Wing C (20.78%).",
              nextMeeting: "Within 30 calendar days."
            })
          };
        })
      }))
    }
  }))
}));

describe('AI MOM Service (aiMomService.js)', () => {
  it('generates structured MOM for A Building with legal entity and resolutions', async () => {
    const mom = await generateMeetingMOM({
      rawNotes: 'Lift 1 was serviced by Otis. DG machine battery voltage checked.',
      scope: 'A_BUILDING',
      meetingDate: '2026-10-24',
      meetingTime: '10:00 AM'
    });

    expect(mom.scope).toBe('A_BUILDING');
    expect(mom.headerInfo.societyName).toContain("'A' Building");
    expect(mom.headerInfo.scopeBadge).toContain("WING 'A'");
    expect(mom.resolutions.length).toBeGreaterThan(0);
    expect(mom.resolutions[0].resNo).toContain('RES-A/2026');
    expect(mom.executiveSummary).toContain('Wing');
    expect(mom.actionItems.length).toBeGreaterThan(0);
  });

  it('generates structured MOM for Common Infrastructure with cross-wing context', async () => {
    const mom = await generateMeetingMOM({
      rawNotes: 'Park+ main boom barrier repaired. Sewage Treatment Plant (STP) tested. Water tanker received.',
      scope: 'COMMON',
      meetingDate: '2026-10-24',
      meetingTime: '11:00 AM'
    });

    expect(mom.scope).toBe('COMMON');
    expect(mom.headerInfo.scopeBadge).toContain('COMMON INFRASTRUCTURE');
    expect(mom.resolutions[0].resNo).toContain('RES-COM/2026');
    expect(mom.financialNotes).toContain('37.66%');
    expect(mom.financialNotes).toContain('41.56%');
    expect(mom.financialNotes).toContain('20.78%');
  });
});

describe('AiMomGenerator Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders heading, scope toggles, metadata controls, and textarea', () => {
    render(<AiMomGenerator isAdmin={true} />);

    expect(screen.getByText(/AI Minutes of Meeting \(MOM\) Generator/i)).toBeInTheDocument();
    expect(screen.getByText(/Building 'A' \(Wing A\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Common Society \/ All Wings/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste or type meeting discussion points/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate AI MOM for Building 'A'/i })).toBeInTheDocument();
  });

  it('switches scope to Common when clicked and updates button text and textarea', () => {
    render(<AiMomGenerator isAdmin={true} />);

    const commonOption = screen.getByText(/Common Society \/ All Wings/i);
    fireEvent.click(commonOption);

    expect(screen.getByRole('button', { name: /Generate AI MOM for Common Infrastructure/i })).toBeInTheDocument();
  });

  it('loads sample notes when clicking helper sample buttons', () => {
    render(<AiMomGenerator isAdmin={true} />);

    const loadCommonBtn = screen.getByText(/Load Common Notes/i);
    fireEvent.click(loadCommonBtn);

    const textarea = screen.getByPlaceholderText(/Paste or type meeting discussion points/i);
    expect(textarea.value).toContain('Common Infrastructure');

    const clearBtn = screen.getByText(/Clear/i);
    fireEvent.click(clearBtn);
    expect(textarea.value).toBe('');
  });

  it('generates MOM and displays official letterhead view with resolutions and signatures', async () => {
    render(<AiMomGenerator isAdmin={true} />);

    const generateBtn = screen.getByRole('button', { name: /Generate AI MOM for Building 'A'/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText(/Official Letterhead/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getAllByText(/MINUTES OF MEETING/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Executive Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/Formal Resolutions Passed/i)).toBeInTheDocument();
    expect(screen.getByText(/Action Item Accountability Register/i)).toBeInTheDocument();
    expect(screen.getByText(/Chairman, Majestique Euriska/i)).toBeInTheDocument();
  });

  it('allows switching between view modes: Edit, Action Register, and Letterhead', async () => {
    render(<AiMomGenerator isAdmin={true} />);

    const generateBtn = screen.getByRole('button', { name: /Generate AI MOM for Building 'A'/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText(/Official Letterhead/i)).toBeInTheDocument();
    });

    // Switch to Edit Mode
    const editBtn = screen.getByText(/Edit & Customize/i);
    fireEvent.click(editBtn);
    expect(screen.getByText(/Customize & Fine-tune Generated Minutes/i)).toBeInTheDocument();

    // Switch to Action Register
    const actionsBtn = screen.getByRole('button', { name: /Action Register/i });
    fireEvent.click(actionsBtn);
    expect(screen.getByText(/Action Item Accountability & Follow-up/i)).toBeInTheDocument();
  });

  it('calls window.print when clicking Print / PDF button', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<AiMomGenerator isAdmin={true} />);

    const generateBtn = screen.getByRole('button', { name: /Generate AI MOM for Building 'A'/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Print \/ PDF/i })).toBeInTheDocument();
    });

    const printBtn = screen.getByRole('button', { name: /Print \/ PDF/i });
    fireEvent.click(printBtn);

    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it('allows selecting committee members through MultiSelectDropdown and includes them in generated minutes', async () => {
    render(<AiMomGenerator isAdmin={true} />);

    // Open multi-select dropdown
    const trigger = screen.getByTestId('multiselect-trigger');
    fireEvent.click(trigger);

    // Select Neha (A-204) and Sandeep (A-301)
    const nehaOption = screen.getByText('Neha');
    fireEvent.click(nehaOption);

    const sandeepOption = screen.getByText('Sandeep');
    fireEvent.click(sandeepOption);

    // Verify chips render in trigger
    expect(screen.getByText(/A-204 \(Neha\)/i)).toBeInTheDocument();
    expect(screen.getByText(/A-301 \(Sandeep\)/i)).toBeInTheDocument();

    // Generate MOM
    const generateBtn = screen.getByRole('button', { name: /Generate AI MOM for Building 'A'/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText(/Official Letterhead/i)).toBeInTheDocument();
    });

    // Check that attendees appear both in the selector chip and on the generated letterhead
    expect(screen.getAllByText(/A-204 \(Neha\)/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/A-301 \(Sandeep\)/i).length).toBeGreaterThanOrEqual(2);
  });
});
