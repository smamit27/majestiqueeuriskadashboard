import React, { useState, useMemo, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../firebase.js';
import { INITIAL_AGM_MEETINGS } from '../../data/agmRecordsData.js';
import './AgmMeetingTracker.css';


export default function AgmMeetingTracker({ isAdmin = false }) {
  const [meetings, setMeetings] = useState(INITIAL_AGM_MEETINGS);
  const [selectedMeetingId, setSelectedMeetingId] = useState('agm-2026');
  const [activeView, setActiveView] = useState('resolutions'); // 'resolutions' | 'summary' | 'pdf' | 'society'
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editStatusItem, setEditStatusItem] = useState(null);

  // Firestore sync
  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;
    try {
      const colRef = collection(db, 'agmRecords');
      const unsub = onSnapshot(colRef, (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          setMeetings(list);
        }
      }, (err) => {
        console.warn('Firestore agmRecords error, using seed data:', err);
      });
      return () => unsub();
    } catch (e) {
      console.warn('AGM sync setup error:', e);
    }
  }, []);

  const activeMeeting = useMemo(() => {
    return meetings.find(m => m.id === selectedMeetingId) || meetings[0] || INITIAL_AGM_MEETINGS[0];
  }, [meetings, selectedMeetingId]);

  // Unique categories for filtering
  const categories = useMemo(() => {
    if (!activeMeeting || !activeMeeting.resolutions) return [];
    return Array.from(new Set(activeMeeting.resolutions.map(r => r.category)));
  }, [activeMeeting]);

  // Filtered resolutions
  const filteredResolutions = useMemo(() => {
    if (!activeMeeting || !activeMeeting.resolutions) return [];
    return activeMeeting.resolutions.filter(res => {
      if (statusFilter !== 'ALL' && res.status !== statusFilter) return false;
      if (categoryFilter !== 'ALL' && res.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const haystack = `${res.itemNo} ${res.title} ${res.category} ${res.summary} ${res.implementation} ${res.assignee}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [activeMeeting, statusFilter, categoryFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const list = activeMeeting?.resolutions || [];
    return {
      total: list.length,
      passed: list.filter(r => r.status === 'PASSED').length,
      actionRequired: list.filter(r => r.status === 'ACTION REQUIRED').length,
      followUp: list.filter(r => r.status === 'FOLLOW-UP REQUIRED').length,
      pending: list.filter(r => r.status === 'PENDING').length,
    };
  }, [activeMeeting]);

  const handleUpdateStatus = async (itemNo, newStatus) => {
    if (!isAdmin) return;
    try {
      const updatedResolutions = activeMeeting.resolutions.map(r => {
        if (r.itemNo === itemNo) {
          return { ...r, status: newStatus };
        }
        return r;
      });

      const updatedMeeting = { ...activeMeeting, resolutions: updatedResolutions };
      setMeetings(prev => prev.map(m => m.id === activeMeeting.id ? updatedMeeting : m));

      if (isFirebaseConfigured && db) {
        const meetingRef = doc(db, 'agmRecords', activeMeeting.id);
        await setDoc(meetingRef, updatedMeeting, { merge: true });
      }
      setEditStatusItem(null);
    } catch (err) {
      console.error('Failed to update resolution status:', err);
    }
  };

  return (
    <div className="agm-meeting-tracker-s1">
      {/* ──────────────────────────────────────────────────────────────────────
          1. Header Banner with Society Details & Meeting Selector
      ────────────────────────────────────────────────────────────────────── */}
      <div className="agm-meeting-tracker-s2">
        <div className="agm-meeting-tracker-s3" />

        <div className="agm-meeting-tracker-s4">
          <div>
            <div className="agm-meeting-tracker-s5">
              <span>🏛️</span>
              <span>OFFICIAL SOCIETY GOVERNANCE ARCHIVE</span>
              <span className="agm-meeting-tracker-s6">
                CERTIFIED & STAMPED
              </span>
            </div>
            <h1 className="agm-meeting-tracker-s7">
              {activeMeeting.societyDetails?.name || "Majestique Euriska 'A' Building CHSL"}
            </h1>
            <p className="agm-meeting-tracker-s8">
              {activeMeeting.societyDetails?.marathiName}
            </p>
            <p className="agm-meeting-tracker-s9">
              Reg: <strong>{activeMeeting.societyDetails?.regNo}</strong> • Email: {activeMeeting.societyDetails?.email}
            </p>
          </div>

          <div className="agm-meeting-tracker-s10">
            {/* Meeting Selector */}
            <div className="agm-meeting-tracker-s11">
              <label className="agm-meeting-tracker-s12">Select AGM / SGM:</label>
              <select
                value={selectedMeetingId}
                onChange={(e) => setSelectedMeetingId(e.target.value)}
                className="agm-meeting-tracker-s13"
              >
                {meetings.map(m => (
                  <option key={m.id} value={m.id} className="agm-meeting-tracker-s14">
                    {m.year} — {m.meetingType} ({m.date})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Actions */}
            <div className="agm-meeting-tracker-s15">
              <a
                href={activeMeeting.documentFile?.downloadUrl || '/downloads/AGM_2026_Minutes_Majestique_Euriska_A_Building.pdf'}
                download={activeMeeting.documentFile?.fileName || 'AGM_2026_Minutes.pdf'}
                target="_blank"
                rel="noopener noreferrer"
                className="agm-meeting-tracker-s16"
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <span>📥</span>
                <span>Download Signed PDF ({activeMeeting.documentFile?.fileSize || '2.25 MB'})</span>
              </a>

              <button
                onClick={() => setActiveView('pdf')}
                className="agm-meeting-tracker-s17" style={{ background: activeView === 'pdf' ? '#10b981' : 'rgba(255,255,255,0.18)' }}
              >
                <span>📄</span>
                <span>View Full PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Meeting Quick Metadata Strip */}
        <div className="agm-meeting-tracker-s18">
          <div>
            <span className="agm-meeting-tracker-s19">Meeting Date</span>
            <p className="agm-meeting-tracker-s20">{activeMeeting.displayDate || activeMeeting.date}</p>
          </div>
          <div>
            <span className="agm-meeting-tracker-s19">Venue</span>
            <p className="agm-meeting-tracker-s20">{activeMeeting.venue}</p>
          </div>
          <div>
            <span className="agm-meeting-tracker-s19">Quorum & Attendance</span>
            <p className="agm-meeting-tracker-s21">
              ✓ {activeMeeting.attendance?.quorumStatus || `${activeMeeting.attendance?.totalMembersPresent} Present`}
            </p>
          </div>
          <div>
            <span className="agm-meeting-tracker-s19">Signatories</span>
            <p className="agm-meeting-tracker-s20">Chairman, Sec (A Singh), Treas.</p>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────
          2. KPI Metric Cards
      ────────────────────────────────────────────────────────────────────── */}
      <div className="agm-meeting-tracker-s22">
        <div className="agm-meeting-tracker-s23">
          <span className="agm-meeting-tracker-s24">Total Resolutions</span>
          <div className="agm-meeting-tracker-s25">{stats.total}</div>
          <span className="agm-meeting-tracker-s26">Agenda Items 1.0 to 7.0</span>
        </div>

        <div className="agm-meeting-tracker-s27">
          <span className="agm-meeting-tracker-s28">Passed & Adopted</span>
          <div className="agm-meeting-tracker-s29">{stats.passed}</div>
          <span className="agm-meeting-tracker-s30">Audit Report & ₹3L FD Mandate</span>
        </div>

        <div className="agm-meeting-tracker-s31">
          <span className="agm-meeting-tracker-s32">Action Required</span>
          <div className="agm-meeting-tracker-s33">{stats.actionRequired}</div>
          <span className="agm-meeting-tracker-s34">Solar Tenders & Sinking Fund</span>
        </div>

        <div className="agm-meeting-tracker-s35">
          <span className="agm-meeting-tracker-s36">Follow-up Required</span>
          <div className="agm-meeting-tracker-s37">{stats.followUp}</div>
          <span className="agm-meeting-tracker-s38">Auditor & Shop Dues Recovery</span>
        </div>

        <div className="agm-meeting-tracker-s39">
          <span className="agm-meeting-tracker-s40">Pending Items</span>
          <div className="agm-meeting-tracker-s41">{stats.pending}</div>
          <span className="agm-meeting-tracker-s42">Covered Parking Verification</span>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────
          3. Sub-Navigation Tabs
      ────────────────────────────────────────────────────────────────────── */}
      <div className="agm-meeting-tracker-s43">
        <button
          onClick={() => setActiveView('resolutions')}
          className="agm-meeting-tracker-s44" style={{ color: activeView === 'resolutions' ? '#196c6c' : '#64748b', borderBottom: activeView === 'resolutions' ? '3px solid #196c6c' : '3px solid transparent' }}
        >
          📋 Agenda & Resolutions ({stats.total})
        </button>

        <button
          onClick={() => setActiveView('summary')}
          className="agm-meeting-tracker-s44" style={{ color: activeView === 'summary' ? '#196c6c' : '#64748b', borderBottom: activeView === 'summary' ? '3px solid #196c6c' : '3px solid transparent' }}
        >
          ⚡ Executive Action Summary & Mandate
        </button>

        <button
          onClick={() => setActiveView('pdf')}
          className="agm-meeting-tracker-s44" style={{ color: activeView === 'pdf' ? '#196c6c' : '#64748b', borderBottom: activeView === 'pdf' ? '3px solid #196c6c' : '3px solid transparent' }}
        >
          📄 Original Signed Document (3 Pages)
        </button>

        <button
          onClick={() => setActiveView('society')}
          className="agm-meeting-tracker-s44" style={{ color: activeView === 'society' ? '#196c6c' : '#64748b', borderBottom: activeView === 'society' ? '3px solid #196c6c' : '3px solid transparent' }}
        >
          🏛️ Signatories & Seal Verification
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────
          4. TAB CONTENT: RESOLUTIONS VIEW
      ────────────────────────────────────────────────────────────────────── */}
      {activeView === 'resolutions' && (
        <div>
          {/* Filter Bar */}
          <div className="agm-meeting-tracker-s45">
            {/* Status Pills */}
            <div className="agm-meeting-tracker-s46">
              <span className="agm-meeting-tracker-s47">Filter:</span>
              {[
                { label: 'All', val: 'ALL' },
                { label: `Passed (${stats.passed})`, val: 'PASSED', bg: '#dcfce7', color: '#166534' },
                { label: `Action Required (${stats.actionRequired})`, val: 'ACTION REQUIRED', bg: '#fef3c7', color: '#92400e' },
                { label: `Follow-Up (${stats.followUp})`, val: 'FOLLOW-UP REQUIRED', bg: '#ede9fe', color: '#5b21b6' },
                { label: `Pending (${stats.pending})`, val: 'PENDING', bg: '#ffe4e6', color: '#9f1239' },
              ].map(f => (
                <button
                  key={f.val}
                  onClick={() => setStatusFilter(f.val)}
                  className="agm-meeting-tracker-s48" style={{ background: statusFilter === f.val ? (f.bg || '#196c6c') : '#f1f5f9', color: statusFilter === f.val ? (f.color || '#ffffff') : '#475569' }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="agm-meeting-tracker-s49">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search resolutions, terms, assignees..."
                className="agm-meeting-tracker-s50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="agm-meeting-tracker-s51"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Resolutions Grid */}
          <div className="agm-meeting-tracker-s52">
            {filteredResolutions.length === 0 ? (
              <div className="agm-meeting-tracker-s53">
                <p className="agm-meeting-tracker-s54">No resolutions matched your filter.</p>
                <button
                  onClick={() => { setStatusFilter('ALL'); setCategoryFilter('ALL'); setSearchQuery(''); }}
                  className="agm-meeting-tracker-s55"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              filteredResolutions.map(res => {
                const getStatusStyle = (st) => {
                  switch (st) {
                    case 'PASSED':
                      return { bg: '#dcfce7', color: '#166534', border: '#bbf7d0', dot: '#16a34a' };
                    case 'ACTION REQUIRED':
                      return { bg: '#fef3c7', color: '#92400e', border: '#fde68a', dot: '#d97706' };
                    case 'FOLLOW-UP REQUIRED':
                      return { bg: '#ede9fe', color: '#5b21b6', border: '#ddd6fe', dot: '#7c3aed' };
                    case 'PENDING':
                      return { bg: '#ffe4e6', color: '#9f1239', border: '#fecdd3', dot: '#e11d48' };
                    default:
                      return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', dot: '#94a3b8' };
                  }
                };
                const stStyle = getStatusStyle(res.status);

                return (
                  <div
                    key={res.id || res.itemNo}
                    className="agm-meeting-tracker-s56" style={{ borderLeft: `5px solid ${stStyle.dot}` }}
                  >
                    <div className="agm-meeting-tracker-s57">
                      <div className="agm-meeting-tracker-s58">
                        <span className="agm-meeting-tracker-s59">
                          ITEM {res.itemNo}
                        </span>
                        <h3 className="agm-meeting-tracker-s60">
                          {res.title}
                        </h3>
                        <span className="agm-meeting-tracker-s61">
                          {res.category}
                        </span>
                      </div>

                      <div className="agm-meeting-tracker-s62">
                        <span className="agm-meeting-tracker-s63" style={{ background: stStyle.bg, color: stStyle.color, border: `1px solid ${stStyle.border}` }}>
                          <span className="agm-meeting-tracker-s64" style={{ background: stStyle.dot }} />
                          {res.status}
                        </span>

                        {isAdmin && (
                          <button
                            onClick={() => setEditStatusItem(editStatusItem === res.itemNo ? null : res.itemNo)}
                            title="Update Status"
                            className="agm-meeting-tracker-s65"
                          >
                            ✏️ Edit
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Admin Status Switcher Popover */}
                    {editStatusItem === res.itemNo && (
                      <div className="agm-meeting-tracker-s66">
                        <span className="agm-meeting-tracker-s67">Update Status:</span>
                        {['PASSED', 'ACTION REQUIRED', 'FOLLOW-UP REQUIRED', 'PENDING', 'RESOLVED'].map(st => (
                          <button
                            key={st}
                            onClick={() => handleUpdateStatus(res.itemNo, st)}
                            className="agm-meeting-tracker-s68" style={{ background: res.status === st ? '#196c6c' : '#ffffff', color: res.status === st ? '#ffffff' : '#334155' }}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Deliberation / Summary */}
                    <div className="agm-meeting-tracker-s69">
                      <div className="agm-meeting-tracker-s70">
                        Deliberation & Approved Resolution
                      </div>
                      {res.summary}
                    </div>

                    {/* Implementation & Action */}
                    <div className="agm-meeting-tracker-s71">
                      <div className="agm-meeting-tracker-s72">
                        <span className="agm-meeting-tracker-s73">📌</span>
                        <div>
                          <span className="agm-meeting-tracker-s74">Assignee</span>
                          <div className="agm-meeting-tracker-s75">{res.assignee}</div>
                        </div>
                      </div>

                      <div className="agm-meeting-tracker-s72">
                        <span className="agm-meeting-tracker-s73">⚡</span>
                        <div>
                          <span className="agm-meeting-tracker-s74">Implementation Mandate</span>
                          <div className="agm-meeting-tracker-s76">{res.implementation}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          5. TAB CONTENT: EXECUTIVE SUMMARY VIEW
      ────────────────────────────────────────────────────────────────────── */}
      {activeView === 'summary' && (
        <div className="agm-meeting-tracker-s77">
          {/* Executive Action Summary Grid */}
          <div className="agm-meeting-tracker-s78">
            {/* Passed & Implementation */}
            {activeMeeting.executiveSummary?.passed?.length > 0 && (
              <div className="agm-meeting-tracker-s79">
                <div className="agm-meeting-tracker-s80">
                  <span className="agm-meeting-tracker-s81">
                    ✓ PASSED & IMPLEMENTED ({activeMeeting.executiveSummary.passed.length})
                  </span>
                </div>
                <div className="agm-meeting-tracker-s82">
                  {activeMeeting.executiveSummary.passed.map((p, idx) => (
                    <div key={idx} className="agm-meeting-tracker-s83">
                      <strong>{p.item || p}</strong>
                      {p.desc && <div className="agm-meeting-tracker-s84">{p.desc}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Required */}
            {activeMeeting.executiveSummary?.actionRequired?.length > 0 && (
              <div className="agm-meeting-tracker-s85">
                <div className="agm-meeting-tracker-s80">
                  <span className="agm-meeting-tracker-s86">
                    ⚡ ACTION REQUIRED ({activeMeeting.executiveSummary.actionRequired.length})
                  </span>
                </div>
                <div className="agm-meeting-tracker-s82">
                  {activeMeeting.executiveSummary.actionRequired.map((a, idx) => (
                    <div key={idx} className="agm-meeting-tracker-s87">
                      <strong>{a.item || a}</strong>
                      {a.desc && <div className="agm-meeting-tracker-s88">{a.desc}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up Required */}
            {activeMeeting.executiveSummary?.followUpRequired?.length > 0 && (
              <div className="agm-meeting-tracker-s89">
                <div className="agm-meeting-tracker-s80">
                  <span className="agm-meeting-tracker-s90">
                    🔍 FOLLOW-UP REQUIRED ({activeMeeting.executiveSummary.followUpRequired.length})
                  </span>
                </div>
                <div className="agm-meeting-tracker-s82">
                  {activeMeeting.executiveSummary.followUpRequired.map((f, idx) => (
                    <div key={idx} className="agm-meeting-tracker-s91">
                      <strong>{f.item || f}</strong>
                      {f.desc && <div className="agm-meeting-tracker-s92">{f.desc}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending (if any) */}
            {activeMeeting.executiveSummary?.pending?.length > 0 && (
              <div className="agm-meeting-tracker-s93">
                <div className="agm-meeting-tracker-s80">
                  <span className="agm-meeting-tracker-s94">
                    ⏳ PENDING ({activeMeeting.executiveSummary.pending.length})
                  </span>
                </div>
                <div className="agm-meeting-tracker-s82">
                  {activeMeeting.executiveSummary.pending.map((p, idx) => (
                    <div key={idx} className="agm-meeting-tracker-s95">
                      <strong>{p.item || p}</strong>
                      {p.desc && <div className="agm-meeting-tracker-s96">{p.desc}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Review Mandate Callout Box */}
          <div className="agm-meeting-tracker-s97">
            <h4 className="agm-meeting-tracker-s98">
              <span>⚖️</span>
              <span>Formal Review Mandate</span>
            </h4>
            <p className="agm-meeting-tracker-s99">
              {activeMeeting.reviewMandate}
            </p>
            <div className="agm-meeting-tracker-s100">
              {activeMeeting.meetingClosing}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          6. TAB CONTENT: FULL PDF DOCUMENT VIEWER
      ────────────────────────────────────────────────────────────────────── */}
      {activeView === 'pdf' && (
        <div className="agm-meeting-tracker-s101">
          <div className="agm-meeting-tracker-s102">
            <div>
              <h3 className="agm-meeting-tracker-s103">
                Signed & Sealed {activeMeeting.title} (Official Scan)
              </h3>
              <p className="agm-meeting-tracker-s104">
                Complete {activeMeeting.documentFile?.pageCount || 3}-page document bearing Society Seal, Chairman, Secretary & Treasurer signatures.
              </p>
            </div>

            <div className="agm-meeting-tracker-s105">
              <a
                href={activeMeeting.documentFile?.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="agm-meeting-tracker-s106"
              >
                <span>↗</span> Open in Dedicated Tab
              </a>

              <a
                href={activeMeeting.documentFile?.downloadUrl}
                download={activeMeeting.documentFile?.fileName}
                className="agm-meeting-tracker-s107"
              >
                <span>📥</span> Download PDF ({activeMeeting.documentFile?.fileSize || 'PDF'})
              </a>
            </div>
          </div>

          {/* Embedded Native Browser PDF Viewer */}
          <div className="agm-meeting-tracker-s108">
            <iframe
              src={`${activeMeeting.documentFile?.downloadUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              title={`${activeMeeting.title} PDF`}
              width="100%"
              height="100%"
              className="agm-meeting-tracker-s109"
            />
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          7. TAB CONTENT: SOCIETY & SEAL VERIFICATION VIEW
      ────────────────────────────────────────────────────────────────────── */}
      {activeView === 'society' && (
        <div className="agm-meeting-tracker-s110">
          {/* Signatories Card */}
          <div className="agm-meeting-tracker-s111">
            <h3 className="agm-meeting-tracker-s112">
              <span>✍️</span> Committee Signatories
            </h3>

            <div className="agm-meeting-tracker-s113">
              <div className="agm-meeting-tracker-s114">
                <div>
                  <div className="agm-meeting-tracker-s115">
                    Chairman {activeMeeting.attendance?.chairperson ? `(${activeMeeting.attendance.chairperson})` : ''}
                  </div>
                  <div className="agm-meeting-tracker-s26">Signed on AGM Minutes (Pages 1, 2, 3)</div>
                </div>
                <span className="agm-meeting-tracker-s116">
                  ✓ Signed
                </span>
              </div>

              <div className="agm-meeting-tracker-s114">
                <div>
                  <div className="agm-meeting-tracker-s115">Secretary</div>
                  <div className="agm-meeting-tracker-s26">A Singh • Signed on AGM Minutes (Pages 1, 2, 3)</div>
                </div>
                <span className="agm-meeting-tracker-s116">
                  ✓ Signed
                </span>
              </div>

              <div className="agm-meeting-tracker-s114">
                <div>
                  <div className="agm-meeting-tracker-s115">Treasurer</div>
                  <div className="agm-meeting-tracker-s26">Signed on AGM Minutes (Pages 1, 2, 3)</div>
                </div>
                <span className="agm-meeting-tracker-s116">
                  ✓ Signed
                </span>
              </div>
            </div>
          </div>

          {/* Official Seal & Registration Info */}
          <div className="agm-meeting-tracker-s111">
            <h3 className="agm-meeting-tracker-s112">
              <span>🛡️</span> Society Official Stamp & Legal Details
            </h3>

            <div className="agm-meeting-tracker-s117">
              <div className="agm-meeting-tracker-s118">
                Round Seal Inscription
              </div>
              <div className="agm-meeting-tracker-s119">
                MAJESTIQUE EURISKA 'A' BUILDING SAHAKARI GRUHRACHANA SANSTHA MARYADIT
              </div>
              <div className="agm-meeting-tracker-s120">
                Reg. No. PNA/PNA/(4)/HSG/(TC)/21207 2019-20 • Dt. 9/8/19
              </div>
            </div>

            <div className="agm-meeting-tracker-s121">
              <p className="agm-meeting-tracker-s122">
                <strong>Office Address:</strong> S. No.2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, District Pune, Pune 411060.
              </p>
              <p className="agm-meeting-tracker-s122">
                <strong>Official Email:</strong> majestiqueeuriska.a@gmail.com
              </p>
              <p className="agm-meeting-tracker-s123">
                <strong>Notice Reference:</strong> Convened in accordance with Maharashtra Co-operative Societies (MCS) Act rules and society bye-laws.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
