/**
 * Official Committee Members Roster
 * Source: Majestique Euriska Common Committee - Committee Members Present in the Meeting
 * Wings: A Building (10), B Building (8), C Building (8) - Total 26 Members
 */

export const COMMITTEE_MEMBERS = [
  // ── Wing A Members (1 to 10) ──
  { sn: 1, flatNo: 'A-204', name: 'Neha', wing: 'Wing A', id: 'A-204' },
  { sn: 2, flatNo: 'A-301', name: 'Sandeep', wing: 'Wing A', id: 'A-301' },
  { sn: 3, flatNo: 'A-404', name: 'Afroza', wing: 'Wing A', id: 'A-404' },
  { sn: 4, flatNo: 'A-501', name: 'Prakash', wing: 'Wing A', id: 'A-501' },
  { sn: 5, flatNo: 'A-505', name: 'Prashant', wing: 'Wing A', id: 'A-505' },
  { sn: 6, flatNo: 'A-602', name: 'Himashu', wing: 'Wing A', id: 'A-602' },
  { sn: 7, flatNo: 'A-603', name: 'Fakruddin', wing: 'Wing A', id: 'A-603' },
  { sn: 8, flatNo: 'A-607', name: 'Ashu', wing: 'Wing A', id: 'A-607' },
  { sn: 9, flatNo: 'A-704', name: 'Sachin', wing: 'Wing A', id: 'A-704' },
  { sn: 10, flatNo: 'A-1007', name: 'Amit', wing: 'Wing A', id: 'A-1007' },

  // ── Wing B Members (11 to 18) ──
  { sn: 11, flatNo: 'B-204', name: 'Sudhir', wing: 'Wing B', id: 'B-204' },
  { sn: 12, flatNo: 'B-402', name: 'Vishal', wing: 'Wing B', id: 'B-402' },
  { sn: 13, flatNo: 'B-503', name: 'Udhav', wing: 'Wing B', id: 'B-503' },
  { sn: 14, flatNo: 'B-507', name: 'Digambar', wing: 'Wing B', id: 'B-507' },
  { sn: 15, flatNo: 'B-508', name: 'Pradeep', wing: 'Wing B', id: 'B-508' },
  { sn: 16, flatNo: 'B-806', name: 'Ankush', wing: 'Wing B', id: 'B-806' },
  { sn: 17, flatNo: 'B-901', name: 'Ganesh', wing: 'Wing B', id: 'B-901' },
  { sn: 18, flatNo: 'B-908', name: 'Ekta', wing: 'Wing B', id: 'B-908' },

  // ── Wing C Members (19 to 26) ──
  { sn: 19, flatNo: 'C-306', name: 'Rohan', wing: 'Wing C', id: 'C-306' },
  { sn: 20, flatNo: 'C-308', name: 'Aamay', wing: 'Wing C', id: 'C-308' },
  { sn: 21, flatNo: 'C-404', name: 'Sameer', wing: 'Wing C', id: 'C-404' },
  { sn: 22, flatNo: 'C-501', name: 'Anirudh', wing: 'Wing C', id: 'C-501' },
  { sn: 23, flatNo: 'C-503', name: 'Rachel', wing: 'Wing C', id: 'C-503' },
  { sn: 24, flatNo: 'C-504', name: 'Santanu', wing: 'Wing C', id: 'C-504' },
  { sn: 25, flatNo: 'C-506', name: 'Hussain', wing: 'Wing C', id: 'C-506' },
  { sn: 26, flatNo: 'C-508', name: 'Surajit', wing: 'Wing C', id: 'C-508' }
].map(item => ({
  ...item,
  label: `${item.flatNo} - ${item.name}`,
  formatted: `${item.flatNo} (${item.name})`
}));

/**
 * Filter committee members by scope:
 * 'A_BUILDING' -> returns Wing A (10 members)
 * 'COMMON'     -> returns all 26 members across Wings A, B, and C
 */
export function getCommitteeMembersByScope(scope = 'COMMON') {
  if (scope === 'A_BUILDING') {
    return COMMITTEE_MEMBERS.filter(m => m.wing === 'Wing A');
  }
  return COMMITTEE_MEMBERS;
}
