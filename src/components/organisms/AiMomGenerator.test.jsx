import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import AiMomGenerator from './AiMomGenerator.jsx';
import AiMomSkeletonLoader from '../molecules/AiMomSkeletonLoader.jsx';
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
                  proposer: "Society Chairman",
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

  it('runs AI Secretary Auto-Detect Attendees from raw notes and updates quorum', async () => {
    render(<AiMomGenerator isAdmin={true} />);

    // In sample Building A notes, flat A-404 is mentioned
    const autoDetectBtn = screen.getByTestId('agent-autodetect-attendees-btn');
    fireEvent.click(autoDetectBtn);

    // Should detect Afroza (A-404) and show feedback toast
    await waitFor(() => {
      expect(screen.getByTestId('agent-feedback-toast')).toBeInTheDocument();
    });

    expect(screen.getAllByText(/A-404 \(Afroza\)/i).length).toBeGreaterThanOrEqual(1);
    // Quorum pill should be present and calculated
    expect(screen.getByTestId('quorum-status-pill')).toBeInTheDocument();
  });

  it('copies official WhatsApp broadcast summary when clicking WhatsApp button', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock
      }
    });

    render(<AiMomGenerator isAdmin={true} />);

    const generateBtn = screen.getByRole('button', { name: /Generate AI MOM for Building 'A'/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByTestId('agent-whatsapp-broadcast-btn')).toBeInTheDocument();
    });

    const whatsappBtn = screen.getByTestId('agent-whatsapp-broadcast-btn');
    fireEvent.click(whatsappBtn);

    expect(writeTextMock).toHaveBeenCalled();
    const copiedText = writeTextMock.mock.calls[0][0];
    expect(copiedText).toContain("MAJESTIQUE EURISKA - WING 'A'");
  });

  it('switches to Graphic Flyer poster view and renders color switcher and download buttons', async () => {
    render(<AiMomGenerator isAdmin={true} />);

    const generateBtn = screen.getByRole('button', { name: /Generate AI MOM for Building 'A'/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByTestId('view-poster-tab-btn')).toBeInTheDocument();
    });

    const posterTabBtn = screen.getByTestId('view-poster-tab-btn');
    fireEvent.click(posterTabBtn);

    // Verify Graphic Flyer elements
    expect(screen.getByText('AGENDA')).toBeInTheDocument();
    expect(screen.getByTestId('color-mode-colorful-btn')).toBeInTheDocument();
    expect(screen.getByTestId('color-mode-bw-btn')).toBeInTheDocument();
    expect(screen.getByTestId('export-png-btn')).toBeInTheDocument();
    expect(screen.getByTestId('export-jpeg-btn')).toBeInTheDocument();
  });

  it('shows Meeting History and Templates view when clicking header button without active MOM', () => {
    render(<AiMomGenerator isAdmin={true} />);

    // Header Meeting History & Templates button is always visible
    const historyBtn = screen.getByTestId('header-meeting-history-btn');
    expect(historyBtn).toBeInTheDocument();
    fireEvent.click(historyBtn);

    // Meeting history & templates view should render
    expect(screen.getByTestId('meeting-history-templates-view')).toBeInTheDocument();
    expect(screen.getByText(/Meeting History & Standard Society Templates/i)).toBeInTheDocument();

    // Official Society Templates should be listed
    expect(screen.getByText(/Wing 'A' Monthly Managing Committee Template/i)).toBeInTheDocument();
    expect(screen.getByText(/Joint Common Infrastructure & AMC Review Template/i)).toBeInTheDocument();
    expect(screen.getByText(/Special General Body Meeting \(SGM\) Template/i)).toBeInTheDocument();
  });

  it('loads Wing A official template into form when clicking quick template button', () => {
    render(<AiMomGenerator isAdmin={true} />);

    const quickWingABtn = screen.getByTestId('quick-wing-a-template-btn');
    fireEvent.click(quickWingABtn);

    const textarea = screen.getByPlaceholderText(/Paste or type meeting discussion points/i);
    expect(textarea.value).toContain("Wing 'A' Elevator AMC");
    expect(screen.getByTestId('agent-feedback-toast')).toBeInTheDocument();
  });

  it('loads template directly into Letterhead preview from History & Templates library', () => {
    render(<AiMomGenerator isAdmin={true} />);

    // Open History view
    fireEvent.click(screen.getByTestId('header-meeting-history-btn'));

    // Find and click Load Template on Wing A template card
    const card = screen.getByTestId('template-card-tmpl-wing-a-monthly');
    const loadBtn = card.querySelector('button');
    fireEvent.click(loadBtn);

    // Should switch to Official Letterhead view with the template's content
    expect(screen.getByText(/Official Letterhead/i)).toBeInTheDocument();
    expect(screen.getByText(/Otis Elevator Maintenance & Sensor Replacement/i)).toBeInTheDocument();
  });

  it('renders AiMomSkeletonLoader molecule with Building A scope badge and animated stages', () => {
    render(<AiMomSkeletonLoader scope="A_BUILDING" />);

    expect(screen.getByTestId('ai-mom-skeleton-loader')).toBeInTheDocument();
    expect(screen.getByText(/WING 'A' SCOPE/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Secretary Agent Active/i)).toBeInTheDocument();
    expect(screen.getByText(/MAJESTIQUE EURISKA — WING 'A'/i)).toBeInTheDocument();
  });

  it('allows saving current MOM as a custom template', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue("My Custom Annual Wing 'A' Template");
    render(<AiMomGenerator isAdmin={true} />);

    // Generate MOM first
    fireEvent.click(screen.getByTestId('generate-mom-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('save-as-template-btn')).toBeInTheDocument();
    });

    const saveTmplBtn = screen.getByTestId('save-as-template-btn');
    fireEvent.click(saveTmplBtn);

    // Feedback should show template saved
    expect(screen.getByTestId('agent-feedback-toast')).toBeInTheDocument();
    expect(screen.getByText(/saved successfully into Meeting History & Templates/i)).toBeInTheDocument();

    // Navigate to history and verify custom template exists
    fireEvent.click(screen.getByTestId('tab-history-templates-btn'));
    expect(screen.getAllByText(/My Custom Annual Wing 'A' Template/i).length).toBeGreaterThanOrEqual(1);
  });

  it('keeps Presided By / Chairperson input field completely empty by default and when loading templates', () => {
    render(<AiMomGenerator isAdmin={true} />);

    const chairpersonInput = screen.getByTestId('mom-chairperson-input');
    // Starts completely empty
    expect(chairpersonInput.value).toBe('');
    expect(chairpersonInput.value).not.toContain('Rohan');

    // Loading Wing A template should keep chairperson empty
    const quickWingABtn = screen.getByTestId('quick-wing-a-template-btn');
    fireEvent.click(quickWingABtn);
    expect(chairpersonInput.value).toBe('');
    expect(chairpersonInput.value).not.toContain('Rohan');

    // Loading Common template should keep chairperson empty
    const quickCommonBtn = screen.getByTestId('quick-common-template-btn');
    fireEvent.click(quickCommonBtn);
    expect(chairpersonInput.value).toBe('');
    expect(chairpersonInput.value).not.toContain('Rohan');
  });

  it('opens Monthly MOM Storage Vault when clicking header button or quick upload button', () => {
    render(<AiMomGenerator isAdmin={true} />);

    // Header Vault button is visible
    const vaultHeaderBtn = screen.getByTestId('header-monthly-mom-vault-btn');
    expect(vaultHeaderBtn).toBeInTheDocument();
    fireEvent.click(vaultHeaderBtn);

    // Should render Monthly MOM storage vault
    expect(screen.getByTestId('monthly-mom-vault-container')).toBeInTheDocument();
    expect(screen.getByText(/Monthly MOM Storage & Upload Vault/i)).toBeInTheDocument();

    // Quick upload button above textarea
    const quickUploadBtn = screen.getByTestId('quick-upload-monthly-mom-btn');
    expect(quickUploadBtn).toBeInTheDocument();
  });
});
