import React, { useState, useMemo, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../firebase.js';
import { INITIAL_AGM_MEETINGS } from '../../data/agmRecordsData.js';

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
    <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto', fontFamily: 'inherit' }}>
      {/* ──────────────────────────────────────────────────────────────────────
          1. Header Banner with Society Details & Meeting Selector
      ────────────────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0e3030 0%, #174e4e 60%, #1f6767 100%)',
        borderRadius: 20,
        padding: '28px 32px',
        color: '#ffffff',
        boxShadow: '0 12px 32px rgba(14, 48, 48, 0.25)',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: -30,
          right: -30,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.14)', padding: '5px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.04em', marginBottom: 10, backdropFilter: 'blur(8px)' }}>
              <span>🏛️</span>
              <span>OFFICIAL SOCIETY GOVERNANCE ARCHIVE</span>
              <span style={{ background: '#10b981', color: '#fff', fontSize: '0.7rem', padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>
                CERTIFIED & STAMPED
              </span>
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em', color: '#ffffff' }}>
              {activeMeeting.societyDetails?.name || "Majestique Euriska 'A' Building CHSL"}
            </h1>
            <p style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#bbf7d0', fontWeight: 500 }}>
              {activeMeeting.societyDetails?.marathiName}
            </p>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.78)', lineHeight: 1.5 }}>
              Reg: <strong>{activeMeeting.societyDetails?.regNo}</strong> • Email: {activeMeeting.societyDetails?.email}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
            {/* Meeting Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Select AGM / SGM:</label>
              <select
                value={selectedMeetingId}
                onChange={(e) => setSelectedMeetingId(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#ffffff',
                  padding: '7px 14px',
                  borderRadius: 10,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  outline: 'none',
                  backdropFilter: 'blur(6px)'
                }}
              >
                {meetings.map(m => (
                  <option key={m.id} value={m.id} style={{ color: '#0f172a', background: '#fff' }}>
                    {m.year} — {m.meetingType} ({m.date})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a
                href={activeMeeting.documentFile?.downloadUrl || '/downloads/AGM_2026_Minutes_Majestique_Euriska_A_Building.pdf'}
                download={activeMeeting.documentFile?.fileName || 'AGM_2026_Minutes.pdf'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#ffffff',
                  color: '#0e3030',
                  padding: '9px 16px',
                  borderRadius: 10,
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                  transition: 'transform 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <span>📥</span>
                <span>Download Signed PDF ({activeMeeting.documentFile?.fileSize || '2.25 MB'})</span>
              </a>

              <button
                onClick={() => setActiveView('pdf')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: activeView === 'pdf' ? '#10b981' : 'rgba(255,255,255,0.18)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.3)',
                  padding: '9px 16px',
                  borderRadius: 10,
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>📄</span>
                <span>View Full PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Meeting Quick Metadata Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginTop: 20,
          paddingTop: 18,
          borderTop: '1px solid rgba(255,255,255,0.16)'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', fontWeight: 700, letterSpacing: '0.05em' }}>Meeting Date</span>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.95rem', fontWeight: 700 }}>{activeMeeting.displayDate || activeMeeting.date}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', fontWeight: 700, letterSpacing: '0.05em' }}>Venue</span>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.95rem', fontWeight: 700 }}>{activeMeeting.venue}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', fontWeight: 700, letterSpacing: '0.05em' }}>Quorum & Attendance</span>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.95rem', fontWeight: 700, color: '#6ee7b7' }}>
              ✓ {activeMeeting.attendance?.quorumStatus || `${activeMeeting.attendance?.totalMembersPresent} Present`}
            </p>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', fontWeight: 700, letterSpacing: '0.05em' }}>Signatories</span>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.95rem', fontWeight: 700 }}>Chairman, Sec (A Singh), Treas.</p>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────
          2. KPI Metric Cards
      ────────────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div style={{ background: '#ffffff', borderRadius: 14, padding: '16px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Total Resolutions</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{stats.total}</div>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Agenda Items 1.0 to 7.0</span>
        </div>

        <div style={{ background: '#f0fdf4', borderRadius: 14, padding: '16px 20px', border: '1px solid #bbf7d0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', color: '#166534', letterSpacing: '0.05em' }}>Passed & Adopted</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a', marginTop: 4 }}>{stats.passed}</div>
          <span style={{ fontSize: '0.78rem', color: '#15803d' }}>Audit Report & ₹3L FD Mandate</span>
        </div>

        <div style={{ background: '#fffbeb', borderRadius: 14, padding: '16px 20px', border: '1px solid #fde68a', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', color: '#92400e', letterSpacing: '0.05em' }}>Action Required</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d97706', marginTop: 4 }}>{stats.actionRequired}</div>
          <span style={{ fontSize: '0.78rem', color: '#b45309' }}>Solar Tenders & Sinking Fund</span>
        </div>

        <div style={{ background: '#f5f3ff', borderRadius: 14, padding: '16px 20px', border: '1px solid #ddd6fe', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', color: '#5b21b6', letterSpacing: '0.05em' }}>Follow-up Required</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#7c3aed', marginTop: 4 }}>{stats.followUp}</div>
          <span style={{ fontSize: '0.78rem', color: '#6d28d9' }}>Auditor & Shop Dues Recovery</span>
        </div>

        <div style={{ background: '#fff1f2', borderRadius: 14, padding: '16px 20px', border: '1px solid #fecdd3', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', color: '#9f1239', letterSpacing: '0.05em' }}>Pending Items</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#e11d48', marginTop: 4 }}>{stats.pending}</div>
          <span style={{ fontSize: '0.78rem', color: '#be123c' }}>Covered Parking Verification</span>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────
          3. Sub-Navigation Tabs
      ────────────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '2px solid #e2e8f0', marginBottom: 22, paddingBottom: 6 }}>
        <button
          onClick={() => setActiveView('resolutions')}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 18px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            color: activeView === 'resolutions' ? '#196c6c' : '#64748b',
            borderBottom: activeView === 'resolutions' ? '3px solid #196c6c' : '3px solid transparent',
            marginBottom: -8,
            transition: 'all 0.15s ease'
          }}
        >
          📋 Agenda & Resolutions ({stats.total})
        </button>

        <button
          onClick={() => setActiveView('summary')}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 18px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            color: activeView === 'summary' ? '#196c6c' : '#64748b',
            borderBottom: activeView === 'summary' ? '3px solid #196c6c' : '3px solid transparent',
            marginBottom: -8,
            transition: 'all 0.15s ease'
          }}
        >
          ⚡ Executive Action Summary & Mandate
        </button>

        <button
          onClick={() => setActiveView('pdf')}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 18px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            color: activeView === 'pdf' ? '#196c6c' : '#64748b',
            borderBottom: activeView === 'pdf' ? '3px solid #196c6c' : '3px solid transparent',
            marginBottom: -8,
            transition: 'all 0.15s ease'
          }}
        >
          📄 Original Signed Document (3 Pages)
        </button>

        <button
          onClick={() => setActiveView('society')}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 18px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            color: activeView === 'society' ? '#196c6c' : '#64748b',
            borderBottom: activeView === 'society' ? '3px solid #196c6c' : '3px solid transparent',
            marginBottom: -8,
            transition: 'all 0.15s ease'
          }}
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
          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            padding: '16px 20px',
            border: '1px solid #e2e8f0',
            marginBottom: 20,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            {/* Status Pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Filter:</span>
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
                  style={{
                    background: statusFilter === f.val ? (f.bg || '#196c6c') : '#f1f5f9',
                    color: statusFilter === f.val ? (f.color || '#ffffff') : '#475569',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 260, flex: 1, maxWidth: 400 }}>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search resolutions, terms, assignees..."
                style={{
                  width: '100%',
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  outline: 'none'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 700 }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Resolutions Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredResolutions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: '#ffffff', borderRadius: 14, border: '1px dashed #cbd5e1' }}>
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#64748b', margin: 0 }}>No resolutions matched your filter.</p>
                <button
                  onClick={() => { setStatusFilter('ALL'); setCategoryFilter('ALL'); setSearchQuery(''); }}
                  style={{ marginTop: 10, background: '#196c6c', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
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
                    style={{
                      background: '#ffffff',
                      borderRadius: 16,
                      padding: '22px 26px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      borderLeft: `5px solid ${stStyle.dot}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{
                          background: '#0f172a',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.88rem',
                          padding: '3px 10px',
                          borderRadius: 6,
                          letterSpacing: '0.04em'
                        }}>
                          ITEM {res.itemNo}
                        </span>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                          {res.title}
                        </h3>
                        <span style={{
                          background: '#f1f5f9',
                          color: '#475569',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 20
                        }}>
                          {res.category}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: stStyle.bg,
                          color: stStyle.color,
                          border: `1px solid ${stStyle.border}`,
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          padding: '5px 12px',
                          borderRadius: 20,
                          letterSpacing: '0.03em'
                        }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: stStyle.dot }} />
                          {res.status}
                        </span>

                        {isAdmin && (
                          <button
                            onClick={() => setEditStatusItem(editStatusItem === res.itemNo ? null : res.itemNo)}
                            title="Update Status"
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              padding: '5px 8px',
                              borderRadius: 6,
                              fontSize: '0.74rem',
                              cursor: 'pointer',
                              color: '#64748b',
                              fontWeight: 600
                            }}
                          >
                            ✏️ Edit
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Admin Status Switcher Popover */}
                    {editStatusItem === res.itemNo && (
                      <div style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: 10,
                        padding: '12px 14px',
                        marginBottom: 14,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        flexWrap: 'wrap'
                      }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>Update Status:</span>
                        {['PASSED', 'ACTION REQUIRED', 'FOLLOW-UP REQUIRED', 'PENDING', 'RESOLVED'].map(st => (
                          <button
                            key={st}
                            onClick={() => handleUpdateStatus(res.itemNo, st)}
                            style={{
                              background: res.status === st ? '#196c6c' : '#ffffff',
                              color: res.status === st ? '#ffffff' : '#334155',
                              border: '1px solid #cbd5e1',
                              borderRadius: 6,
                              padding: '4px 10px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Deliberation / Summary */}
                    <div style={{
                      background: '#f8fafc',
                      borderRadius: 10,
                      padding: '14px 16px',
                      fontSize: '0.92rem',
                      lineHeight: 1.6,
                      color: '#1e293b',
                      marginBottom: 14,
                      border: '1px solid #edf2f7'
                    }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: 4 }}>
                        Deliberation & Approved Resolution
                      </div>
                      {res.summary}
                    </div>

                    {/* Implementation & Action */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{ fontSize: '1rem' }}>📌</span>
                        <div>
                          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: '#64748b' }}>Assignee</span>
                          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>{res.assignee}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{ fontSize: '1rem' }}>⚡</span>
                        <div>
                          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: '#64748b' }}>Implementation Mandate</span>
                          <div style={{ fontSize: '0.86rem', color: '#334155', lineHeight: 1.4 }}>{res.implementation}</div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Executive Action Summary Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
            {/* Passed & Implementation */}
            {activeMeeting.executiveSummary?.passed?.length > 0 && (
              <div style={{ background: '#ffffff', borderRadius: 16, padding: '22px', border: '1px solid #bbf7d0', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ background: '#dcfce7', color: '#166534', padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 800 }}>
                    ✓ PASSED & IMPLEMENTED ({activeMeeting.executiveSummary.passed.length})
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {activeMeeting.executiveSummary.passed.map((p, idx) => (
                    <div key={idx} style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 12px', fontSize: '0.84rem', color: '#14532d', lineHeight: 1.45 }}>
                      <strong>{p.item || p}</strong>
                      {p.desc && <div style={{ fontSize: '0.78rem', color: '#166534', marginTop: 3 }}>{p.desc}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Required */}
            {activeMeeting.executiveSummary?.actionRequired?.length > 0 && (
              <div style={{ background: '#ffffff', borderRadius: 16, padding: '22px', border: '1px solid #fde68a', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ background: '#fef3c7', color: '#92400e', padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 800 }}>
                    ⚡ ACTION REQUIRED ({activeMeeting.executiveSummary.actionRequired.length})
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {activeMeeting.executiveSummary.actionRequired.map((a, idx) => (
                    <div key={idx} style={{ background: '#fffbeb', borderRadius: 8, padding: '10px 12px', fontSize: '0.84rem', color: '#78350f', lineHeight: 1.45 }}>
                      <strong>{a.item || a}</strong>
                      {a.desc && <div style={{ fontSize: '0.78rem', color: '#92400e', marginTop: 3 }}>{a.desc}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up Required */}
            {activeMeeting.executiveSummary?.followUpRequired?.length > 0 && (
              <div style={{ background: '#ffffff', borderRadius: 16, padding: '22px', border: '1px solid #ddd6fe', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ background: '#ede9fe', color: '#5b21b6', padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 800 }}>
                    🔍 FOLLOW-UP REQUIRED ({activeMeeting.executiveSummary.followUpRequired.length})
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {activeMeeting.executiveSummary.followUpRequired.map((f, idx) => (
                    <div key={idx} style={{ background: '#f5f3ff', borderRadius: 8, padding: '10px 12px', fontSize: '0.84rem', color: '#4c1d95', lineHeight: 1.45 }}>
                      <strong>{f.item || f}</strong>
                      {f.desc && <div style={{ fontSize: '0.78rem', color: '#5b21b6', marginTop: 3 }}>{f.desc}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending (if any) */}
            {activeMeeting.executiveSummary?.pending?.length > 0 && (
              <div style={{ background: '#ffffff', borderRadius: 16, padding: '22px', border: '1px solid #fecdd3', boxShadow: '0 4px 12px rgba(225, 29, 72, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ background: '#ffe4e6', color: '#9f1239', padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 800 }}>
                    ⏳ PENDING ({activeMeeting.executiveSummary.pending.length})
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {activeMeeting.executiveSummary.pending.map((p, idx) => (
                    <div key={idx} style={{ background: '#fff1f2', borderRadius: 8, padding: '10px 12px', fontSize: '0.84rem', color: '#881337', lineHeight: 1.45 }}>
                      <strong>{p.item || p}</strong>
                      {p.desc && <div style={{ fontSize: '0.78rem', color: '#9f1239', marginTop: 3 }}>{p.desc}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Review Mandate Callout Box */}
          <div style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)',
            borderRadius: 16,
            padding: '24px 28px',
            border: '1px solid #cbd5e1'
          }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>⚖️</span>
              <span>Formal Review Mandate</span>
            </h4>
            <p style={{ margin: '0 0 14px 0', fontSize: '0.92rem', color: '#334155', lineHeight: 1.6 }}>
              {activeMeeting.reviewMandate}
            </p>
            <div style={{ fontSize: '0.84rem', color: '#64748b', fontStyle: 'italic', borderTop: '1px solid #cbd5e1', paddingTop: 10 }}>
              {activeMeeting.meetingClosing}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          6. TAB CONTENT: FULL PDF DOCUMENT VIEWER
      ────────────────────────────────────────────────────────────────────── */}
      {activeView === 'pdf' && (
        <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 14 }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                Signed & Sealed {activeMeeting.title} (Official Scan)
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                Complete {activeMeeting.documentFile?.pageCount || 3}-page document bearing Society Seal, Chairman, Secretary & Treasurer signatures.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <a
                href={activeMeeting.documentFile?.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: '#f1f5f9',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>↗</span> Open in Dedicated Tab
              </a>

              <a
                href={activeMeeting.documentFile?.downloadUrl}
                download={activeMeeting.documentFile?.fileName}
                style={{
                  background: '#196c6c',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>📥</span> Download PDF ({activeMeeting.documentFile?.fileSize || 'PDF'})
              </a>
            </div>
          </div>

          {/* Embedded Native Browser PDF Viewer */}
          <div style={{
            width: '100%',
            height: '840px',
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid #cbd5e1',
            background: '#f8fafc'
          }}>
            <iframe
              src={`${activeMeeting.documentFile?.downloadUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              title={`${activeMeeting.title} PDF`}
              width="100%"
              height="100%"
              style={{ border: 'none', display: 'block' }}
            />
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          7. TAB CONTENT: SOCIETY & SEAL VERIFICATION VIEW
      ────────────────────────────────────────────────────────────────────── */}
      {activeView === 'society' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
          {/* Signatories Card */}
          <div style={{ background: '#ffffff', borderRadius: 16, padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>✍️</span> Committee Signatories
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #edf2f7' }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>
                    Chairman {activeMeeting.attendance?.chairperson ? `(${activeMeeting.attendance.chairperson})` : ''}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Signed on AGM Minutes (Pages 1, 2, 3)</div>
                </div>
                <span style={{ background: '#dcfce7', color: '#166534', fontSize: '0.74rem', fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>
                  ✓ Signed
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #edf2f7' }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>Secretary</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>A Singh • Signed on AGM Minutes (Pages 1, 2, 3)</div>
                </div>
                <span style={{ background: '#dcfce7', color: '#166534', fontSize: '0.74rem', fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>
                  ✓ Signed
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #edf2f7' }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>Treasurer</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Signed on AGM Minutes (Pages 1, 2, 3)</div>
                </div>
                <span style={{ background: '#dcfce7', color: '#166534', fontSize: '0.74rem', fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>
                  ✓ Signed
                </span>
              </div>
            </div>
          </div>

          {/* Official Seal & Registration Info */}
          <div style={{ background: '#ffffff', borderRadius: 16, padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🛡️</span> Society Official Stamp & Legal Details
            </h3>

            <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '16px', border: '1px solid #bbf7d0', marginBottom: 14 }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: '#166534', letterSpacing: '0.05em' }}>
                Round Seal Inscription
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#14532d', marginTop: 4, lineHeight: 1.5 }}>
                MAJESTIQUE EURISKA 'A' BUILDING SAHAKARI GRUHRACHANA SANSTHA MARYADIT
              </div>
              <div style={{ fontSize: '0.82rem', color: '#166534', marginTop: 4 }}>
                Reg. No. PNA/PNA/(4)/HSG/(TC)/21207 2019-20 • Dt. 9/8/19
              </div>
            </div>

            <div style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.6 }}>
              <p style={{ margin: '0 0 8px 0' }}>
                <strong>Office Address:</strong> S. No.2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, District Pune, Pune 411060.
              </p>
              <p style={{ margin: '0 0 8px 0' }}>
                <strong>Official Email:</strong> majestiqueeuriska.a@gmail.com
              </p>
              <p style={{ margin: 0 }}>
                <strong>Notice Reference:</strong> Convened in accordance with Maharashtra Co-operative Societies (MCS) Act rules and society bye-laws.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
