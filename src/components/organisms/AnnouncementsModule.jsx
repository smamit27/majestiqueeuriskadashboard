import React, { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../firebase.js';
import { announcements as mockAnnouncements } from '../../data/mockData.js';

const CATEGORY_OPTIONS = ['General', 'Maintenance', 'Event', 'Emergency', 'Water', 'Safety', 'Security', 'Finance'];
const PRIORITY_OPTIONS  = ['High', 'Medium', 'Low'];
const AUDIENCE_OPTIONS  = ['All Residents', 'All Towers', 'Tower A', 'Tower B', 'Tower C', 'Residents', 'Committee'];

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch { return iso; }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const BLANK_FORM = {
  title: '', summary: '', category: 'General', priority: 'Medium',
  audience: 'All Residents', pinned: false, postedOn: today(),
};

export default function AnnouncementsModule({ isAdmin = false }) {
  const [items, setItems]         = useState([]);
  const [formOpen, setFormOpen]   = useState(false);
  const [editing, setEditing]     = useState(null); // null = add, obj = edit
  const [form, setForm]           = useState(BLANK_FORM);
  const [saving, setSaving]       = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCat, setFilterCat]           = useState('');
  const [source, setSource]       = useState('mock');

  // ── Load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      const sorted = [...mockAnnouncements].sort((a, b) =>
        new Date(b.postedOn) - new Date(a.postedOn)
      );
      setItems(sorted);
      setSource('mock');
      return;
    }

    const colRef = collection(db, 'announcements');
    const unsub = onSnapshot(colRef, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.postedOn) - new Date(a.postedOn);
      });
      setItems(docs.length > 0 ? docs : mockAnnouncements);
      setSource('firebase');
    }, () => {
      setItems(mockAnnouncements);
      setSource('mock');
    });

    return () => unsub();
  }, []);

  // ── Filter ────────────────────────────────────────────────────────
  const filtered = items.filter(item => {
    const q = searchText.toLowerCase();
    if (q && !`${item.title} ${item.summary} ${item.category} ${item.audience}`.toLowerCase().includes(q)) return false;
    if (filterPriority && item.priority !== filterPriority) return false;
    if (filterCat && item.category !== filterCat) return false;
    return true;
  });

  const pinned  = filtered.filter(i => i.pinned);
  const regular = filtered.filter(i => !i.pinned);
  const displayed = [...pinned, ...regular];

  // ── Form helpers ──────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null);
    setForm({ ...BLANK_FORM, postedOn: today() });
    setFormOpen(true);
  };
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title || '', summary: item.summary || '',
      category: item.category || 'General', priority: item.priority || 'Medium',
      audience: item.audience || 'All Residents',
      pinned: item.pinned || false, postedOn: item.postedOn || today(),
    });
    setFormOpen(true);
  };
  const closeForm = () => { setFormOpen(false); setEditing(null); };

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (isFirebaseConfigured && db) {
        if (editing) {
          await updateDoc(doc(db, 'announcements', editing.id), {
            ...form, updatedAt: serverTimestamp(),
          });
        } else {
          await addDoc(collection(db, 'announcements'), {
            ...form, createdAt: serverTimestamp(),
          });
        }
      } else {
        // local mock update
        if (editing) {
          setItems(prev => prev.map(i => i.id === editing.id ? { ...i, ...form } : i));
        } else {
          const newItem = { id: `ANN-${Date.now()}`, ...form };
          setItems(prev => [newItem, ...prev]);
        }
      }
      closeForm();
    } finally {
      setSaving(false);
    }
  }, [form, editing]);

  const handleDelete = useCallback(async (item) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'announcements', item.id));
    } else {
      setItems(prev => prev.filter(i => i.id !== item.id));
    }
  }, []);

  const handleTogglePin = useCallback(async (item) => {
    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, 'announcements', item.id), { pinned: !item.pinned });
    } else {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, pinned: !i.pinned } : i));
    }
  }, []);

  const highCount = items.filter(i => i.priority === 'High').length;
  const pinnedCount = items.filter(i => i.pinned).length;

  return (
    <div className="ann-shell">
      {/* ── Hero ── */}
      <div className="ann-hero">
        <div>
          <h2>📢 Notice Board</h2>
          <p>Society announcements, alerts, and community updates</p>
        </div>
        <div className="ann-hero-meta">
          <div className="ann-hero-stat">
            <strong>{items.length}</strong>
            <span>Total</span>
          </div>
          <div className="ann-hero-stat">
            <strong style={{ color: '#fcd34d' }}>{highCount}</strong>
            <span>High Priority</span>
          </div>
          <div className="ann-hero-stat">
            <strong style={{ color: '#C49B4F' }}>{pinnedCount}</strong>
            <span>Pinned</span>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="ann-toolbar">
        <input
          className="ann-search-input"
          placeholder="🔍  Search announcements..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
        <select
          className="ann-filter-select"
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
        >
          <option value="">All Priorities</option>
          {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          className="ann-filter-select"
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
        >
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {isAdmin && (
          <button className="ann-add-btn" onClick={openAdd}>
            ＋ New Announcement
          </button>
        )}
      </div>

      {/* ── Cards ── */}
      {displayed.length === 0 ? (
        <div className="ann-empty">
          <span>📭</span>
          No announcements found.
        </div>
      ) : (
        <div className="ann-cards-grid">
          {displayed.map(item => (
            <AnnouncementCard
              key={item.id}
              item={item}
              isAdmin={isAdmin}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item)}
              onTogglePin={() => handleTogglePin(item)}
            />
          ))}
        </div>
      )}

      {/* ── Form Modal ── */}
      {formOpen && (
        <div className="ann-form-overlay" onClick={closeForm}>
          <div className="ann-form-modal" onClick={e => e.stopPropagation()}>
            <h3 className="ann-form-title">
              {editing ? '✏️ Edit Announcement' : '📢 New Announcement'}
            </h3>
            <div className="ann-form-grid">
              <div className="ann-form-field">
                <label>Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Announcement title..."
                  autoFocus
                />
              </div>
              <div className="ann-form-field">
                <label>Summary / Body</label>
                <textarea
                  rows={3}
                  value={form.summary}
                  onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
                  placeholder="Describe the announcement in detail..."
                />
              </div>
              <div className="ann-form-row">
                <div className="ann-form-field">
                  <label>Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="ann-form-field">
                  <label>Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="ann-form-row">
                <div className="ann-form-field">
                  <label>Audience</label>
                  <select value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}>
                    {AUDIENCE_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="ann-form-field">
                  <label>Posted On</label>
                  <input
                    type="date"
                    value={form.postedOn}
                    onChange={e => setForm(f => ({ ...f, postedOn: e.target.value }))}
                  />
                </div>
              </div>
              <label className="ann-pin-toggle">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))}
                />
                📌 Pin this announcement to the top
              </label>
            </div>
            <div className="ann-form-actions">
              <button className="ann-btn-cancel" onClick={closeForm}>Cancel</button>
              <button className="ann-btn-save" onClick={handleSave} disabled={saving || !form.title.trim()}>
                {saving ? 'Saving…' : editing ? 'Update' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnnouncementCard({ item, isAdmin, onEdit, onDelete, onTogglePin }) {
  return (
    <div className={`ann-card ${item.pinned ? 'ann-card--pinned' : ''}`}>
      <div className="ann-card-header">
        {item.pinned && <span className="ann-pin-icon">📌</span>}
        <h3 className="ann-card-title">{item.title}</h3>
        {isAdmin && (
          <div className="ann-card-actions">
            <button className="ann-icon-btn ann-icon-btn--pin" onClick={onTogglePin} title={item.pinned ? 'Unpin' : 'Pin'}>
              {item.pinned ? '📌' : '📍'}
            </button>
            <button className="ann-icon-btn" onClick={onEdit} title="Edit">✏️</button>
            <button className="ann-icon-btn ann-icon-btn--danger" onClick={onDelete} title="Delete">🗑</button>
          </div>
        )}
      </div>
      {item.summary && <p className="ann-card-summary">{item.summary}</p>}
      <div className="ann-card-footer">
        <span className={`ann-priority-badge ann-priority-badge--${item.priority}`}>
          {item.priority}
        </span>
        {item.category && <span className="ann-cat-pill">{item.category}</span>}
        {item.audience && <span className="ann-audience-pill">{item.audience}</span>}
        <span className="ann-date">{formatDate(item.postedOn)}</span>
      </div>
    </div>
  );
}
