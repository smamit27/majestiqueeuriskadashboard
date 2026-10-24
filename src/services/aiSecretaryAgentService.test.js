import { describe, it, expect } from 'vitest';
import { 
  scanNotesForAttendees, 
  calculateQuorum, 
  autoAssignActionItems, 
  generateWhatsAppNotice 
} from './aiSecretaryAgentService.js';
import { COMMITTEE_MEMBERS } from '../data/committeeMembersData.js';

describe('AI Secretary Agent Service (aiSecretaryAgentService.js)', () => {
  describe('scanNotesForAttendees', () => {
    it('detects committee members mentioned by flat number and by name', () => {
      const sampleNotes = `
        Meeting commenced at 11am. A-204 Neha was present and opened the meeting.
        Sandeep from A-301 and Rohan from C-306 raised points regarding parking.
        Prakash also attended. Estate Manager was present to note issues.
      `;

      const result = scanNotesForAttendees(sampleNotes, COMMITTEE_MEMBERS);

      expect(result.detectedMemberIds).toContain('A-204'); // Neha
      expect(result.detectedMemberIds).toContain('A-301'); // Sandeep
      expect(result.detectedMemberIds).toContain('C-306'); // Rohan
      expect(result.detectedMemberIds).toContain('A-501'); // Prakash
      expect(result.detectedRoles).toContain('Estate Manager');
      expect(result.totalDetected).toBeGreaterThanOrEqual(4);
    });

    it('returns empty lists when notes are empty or invalid', () => {
      const result = scanNotesForAttendees('');
      expect(result.detectedMemberIds).toEqual([]);
      expect(result.detectedRoles).toEqual([]);
      expect(result.totalDetected).toBe(0);
    });
  });

  describe('calculateQuorum', () => {
    it('correctly calculates quorum for Wing A (10 total, requires 5)', () => {
      // 3 members present -> Quorum Short
      const shortQuorum = calculateQuorum(['A-204', 'A-301', 'A-404'], 'A_BUILDING', COMMITTEE_MEMBERS);
      expect(shortQuorum.isQuorumMet).toBe(false);
      expect(shortQuorum.totalEligible).toBe(10);
      expect(shortQuorum.presentCount).toBe(3);
      expect(shortQuorum.quorumThreshold).toBe(5);

      // 6 members present -> Quorum Met
      const validQuorum = calculateQuorum(
        ['A-204', 'A-301', 'A-404', 'A-501', 'A-505', 'A-602'],
        'A_BUILDING',
        COMMITTEE_MEMBERS
      );
      expect(validQuorum.isQuorumMet).toBe(true);
      expect(validQuorum.presentCount).toBe(6);
      expect(validQuorum.percentage).toBe(60);
    });

    it('correctly calculates quorum for Common Scope (26 total, requires 13)', () => {
      const commonQuorum = calculateQuorum(
        ['A-204', 'A-301', 'B-204', 'B-402', 'C-306', 'C-308'],
        'COMMON',
        COMMITTEE_MEMBERS
      );
      expect(commonQuorum.isQuorumMet).toBe(false);
      expect(commonQuorum.totalEligible).toBe(26);
      expect(commonQuorum.quorumThreshold).toBe(13);
    });
  });

  describe('autoAssignActionItems', () => {
    it('maps lift and maintenance action items to appropriate roles', () => {
      const rawActions = [
        { id: '1', task: 'Check lift sensor calibration', category: 'Maintenance' },
        { id: '2', task: 'Recover quarterly maintenance dues from 6 flats', category: 'Finance' },
        { id: '3', task: 'Replace water tank ball valve', category: 'Plumbing' }
      ];

      const assigned = autoAssignActionItems(rawActions, ['A-204 (Neha)', 'A-501 (Prakash)']);

      expect(assigned[0].assignedTo).toContain('Otis');
      expect(assigned[1].assignedTo).toContain('Treasurer');
      expect(assigned[2].assignedTo).toContain('Plumber');
    });
  });

  describe('generateWhatsAppNotice', () => {
    it('generates well-formatted WhatsApp broadcast text with emoji headers', () => {
      const mockMom = {
        scope: 'A_BUILDING',
        executiveSummary: 'Wing A Lift serviced, DG battery checked, dues collection ongoing.',
        headerInfo: {
          meetingDate: '2026-10-24',
          meetingTime: '11:00 AM',
          venue: "Society Office / Wing 'A' Lobby",
          attendees: ['A-204 (Neha)', 'A-301 (Sandeep)']
        },
        resolutions: [
          { resNo: 'RES-A/2026/01', subject: 'Otis Lift Sensor', verdict: 'Approved', text: 'Resolved to approve sensor invoice.' }
        ],
        actionItems: [
          { task: 'Collect outstanding dues', assignedTo: 'Treasurer', dueDate: '2026-11-05' }
        ],
        financialNotes: '6 flats outstanding.'
      };

      const notice = generateWhatsAppNotice(mockMom);

      expect(notice).toContain("MAJESTIQUE EURISKA - WING 'A'");
      expect(notice).toContain('2026-10-24');
      expect(notice).toContain('RES-A/2026/01');
      expect(notice).toContain('Treasurer');
      expect(notice).toContain('A-204 (Neha)');
    });
  });
});
