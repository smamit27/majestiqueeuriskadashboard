import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';

// ─── Constants ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'a_building', label: 'A Building Work', emoji: '🏢' },
  { id: 'common',     label: 'Common Work',     emoji: '🏘️' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const PRIORITY_OPTIONS  = ['High', 'Medium', 'Low', ''];
const STATUS_OPTIONS    = ['Pending', 'In Progress', 'Done', 'On Hold', ''];

const PRIORITY_STYLE = {
  High:   { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  Medium: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  Low:    { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
};
const STATUS_STYLE = {
  Done:         { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7'  },
  'In Progress':{ bg: '#dbeafe', color: '#1e3a8a', border: '#93c5fd'  },
  Pending:      { bg: '#fef9c3', color: '#713f12', border: '#fde047'  },
  'On Hold':    { bg: '#f3e8ff', color: '#581c87', border: '#d8b4fe'  },
};

// Sortable column config
const COLUMNS = [
  { key: '_idx',           label: '#',              w: 48,  sortable: false },
  { key: 'taskCategory',   label: 'Task',           w: 180, sortable: true  },
  { key: 'area',           label: 'Area',           w: 120, sortable: true  },
  { key: 'taskDescription',label: 'Description',    w: 220, sortable: false },
  { key: 'vendorName',     label: 'Vendor',         w: 120, sortable: true  },
  { key: 'assignedTo',     label: 'Assigned',       w: 110, sortable: true  },
  { key: 'startDate',      label: 'Start',          w: 100, sortable: true  },
  { key: 'deadline',       label: 'Deadline',       w: 100, sortable: true  },
  { key: 'priority',       label: 'Priority',       w: 90,  sortable: true  },
  { key: 'status',         label: 'Status',         w: 120, sortable: true  },
  { key: '_daysLeft',      label: 'Days Left',      w: 100, sortable: true  },
  { key: 'remarks',        label: 'Remarks',        w: 140, sortable: false },
];

// ─── Seed data ──────────────────────────────────────────────────────────────────
const INITIAL_COMMON = [
  { id:'CT-001', taskCategory:'EPDM', area:'Common Area', taskDescription:'To covering. Kids play area', vendorName:'S3 Sports', assignedTo:'Siddu/Amit', startDate:'2026-01-28', deadline:'2026-02-02', priority:'High',   status:'Done',    remarks:'' },
  { id:'CT-002', taskCategory:'Painting (Play Ground Area)', area:'Common Area', taskDescription:'To covering. Kids play area', vendorName:'', assignedTo:'Siddu', startDate:'', deadline:'', priority:'', status:'Done', remarks:'' },
  { id:'CT-003', taskCategory:'Speed Breaker', area:'Common Area', taskDescription:'1-1 speed breaker near to C Building, B Building. Outside of Society.', vendorName:'', assignedTo:'Siddu', startDate:'', deadline:'', priority:'', status:'Done', remarks:'' },
  { id:'CT-004', taskCategory:'Fire Safety Works', area:'Common Area', taskDescription:'Rectification of all pending fire-related issues and ensuring the fire pump is fully operational and ready (critical).', vendorName:'', assignedTo:'Siddu', startDate:'', deadline:'', priority:'High', status:'Pending', remarks:'' },
  { id:'CT-005', taskCategory:'Club House Painting', area:'Common Area', taskDescription:'', vendorName:'', assignedTo:'Siddu', startDate:'', deadline:'', priority:'', status:'Pending', remarks:'' },
  { id:'CT-006', taskCategory:'Trees Remove: Near Club House', area:'Common Area', taskDescription:'Trees in front of the club house are to be relocated because they are damaging floor', vendorName:'', assignedTo:'Siddu', startDate:'', deadline:'', priority:'', status:'Pending', remarks:'' },
  { id:'CT-007', taskCategory:'Call Vishal (Builder) to Remove Sheet', area:'Common Area', taskDescription:'', vendorName:'', assignedTo:'', startDate:'', deadline:'', priority:'', status:'Done', remarks:'' },
  { id:'CT-008', taskCategory:'Builders Follow Up for Wall Plaster', area:'Common Area', taskDescription:'', vendorName:'', assignedTo:'', startDate:'', deadline:'', priority:'', status:'Pending', remarks:'' },
  { id:'CT-009', taskCategory:'Bird Net: Club House', area:'Common Area', taskDescription:'Add Bird net', vendorName:'', assignedTo:'', startDate:'', deadline:'', priority:'', status:'Pending', remarks:'' },
  { id:'CT-010', taskCategory:'Poll Painting', area:'Common Area', taskDescription:'', vendorName:'', assignedTo:'', startDate:'', deadline:'', priority:'', status:'Pending', remarks:'' },
  { id:'CT-011', taskCategory:'Swimming Pool: Drain Cover, Sand Change', area:'Common Area', taskDescription:'', vendorName:'', assignedTo:'', startDate:'', deadline:'', priority:'', status:'Pending', remarks:'' },
];
const INITIAL_A_BUILDING = [
  { id:'AB-001', taskCategory:'A Building Work', area:'A Building', taskDescription:'', vendorName:'', assignedTo:'Siddu', startDate:'', deadline:'', priority:'', status:'Pending', remarks:'' },
];

// ─── Pure helpers ───────────────────────────────────────────────────────────────
function calcDaysLeft(deadline, status) {
  if (!deadline || status === 'Done') return null;
  return Math.ceil((new Date(deadline) - new Date()) / 86400000);
}

function fmtDate(val) {
  if (!val) return '—';
  const [y, m, d] = val.split('-');
  return `${d}/${m}/${y}`;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function highlight(text, query) {
  if (!query || !text) return text || '—';
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: '#fde68a', color: '#92400e', borderRadius: 3, padding: '0 2px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ─── Mini components ────────────────────────────────────────────────────────────
function Pill({ text, styleMap }) {
  const s = styleMap?.[text];
  if (!s || !text) return <span style={{ color: '#c4b99a', fontSize: '0.78rem' }}>—</span>;
  return (
    <span style={{
      display: 'inline-block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em',
      padding: '2px 9px', borderRadius: 20, whiteSpace: 'nowrap',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>{text}</span>
  );
}

function DaysChip({ days }) {
  if (days === null) return <span style={{ color: '#c4b99a', fontSize: '0.78rem' }}>—</span>;
  const color = days < 0 ? '#991b1b' : days <= 3 ? '#d97706' : '#065f46';
  const bg    = days < 0 ? '#fee2e2' : days <= 3 ? '#fef3c7' : '#d1fae5';
  const label = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today!' : `${days}d left`;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: '0.72rem', fontWeight: 700, padding: '2px 9px',
      borderRadius: 20, background: bg, color,
    }}>
      {days < 0 && <span>⚠</span>}
      {label}
    </span>
  );
}

function SortIcon({ dir }) {
  if (!dir) return <span style={{ opacity: 0.3, fontSize: '0.65rem' }}>⇅</span>;
  return <span style={{ fontSize: '0.65rem' }}>{dir === 'asc' ? '↑' : '↓'}</span>;
}

// ─── Task Modal ─────────────────────────────────────────────────────────────────
const EMPTY_TASK = {
  taskCategory: '', area: '', taskDescription: '', vendorName: '',
  assignedTo: 'Siddu', startDate: '', deadline: '', priority: '', status: 'Pending', remarks: '',
};

function TaskModal({ task, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY_TASK, ...(task || {}) });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const F = { width: '100%', padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(61,63,52,0.16)', background: '#fffefb', color: '#1d2a24', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none' };
  const L = { fontSize: '0.73rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#5f665f', display: 'block', marginBottom: 5 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div style={{ background: '#fffaf2', borderRadius: 22, padding: '28px 28px 22px', width: '100%', maxWidth: 700, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 40px 100px rgba(0,0,0,0.28)' }}
        onClick={e => e.stopPropagation()}>

        {/* Modal header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#196c6c' }}>
              {task?.id ? 'Edit Task' : 'New Task'}
            </p>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.2rem', fontWeight: 800, color: '#0b2b26' }}>
              {task?.id ? task.taskCategory || 'Edit Task' : '➕ Add New Task'}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(61,63,52,0.08)', border: 'none', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px' }}>
          {/* Full-width fields */}
          <label style={{ gridColumn: '1/-1' }}>
            <span style={L}>Task Category *</span>
            <input style={F} value={form.taskCategory} onChange={e => set('taskCategory', e.target.value)} placeholder="e.g. Fire Safety Works" />
          </label>

          <label>
            <span style={L}>Area</span>
            <input style={F} value={form.area} onChange={e => set('area', e.target.value)} placeholder="Common Area / A Building" />
          </label>
          <label>
            <span style={L}>Assigned To</span>
            <input style={F} value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)} placeholder="Siddu" />
          </label>

          <label>
            <span style={L}>Vendor Name</span>
            <input style={F} value={form.vendorName} onChange={e => set('vendorName', e.target.value)} />
          </label>
          <label>
            <span style={L}>Start Date</span>
            <input type="date" style={F} value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          </label>

          <label>
            <span style={L}>Deadline</span>
            <input type="date" style={F} value={form.deadline} onChange={e => set('deadline', e.target.value)} />
          </label>
          <label>
            <span style={L}>Priority</span>
            <select style={F} value={form.priority} onChange={e => set('priority', e.target.value)}>
              {PRIORITY_OPTIONS.map(o => <option key={o} value={o}>{o || '— None —'}</option>)}
            </select>
          </label>

          <label style={{ gridColumn: '1/-1' }}>
            <span style={L}>Status</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {STATUS_OPTIONS.filter(Boolean).map(s => {
                const st = STATUS_STYLE[s];
                const active = form.status === s;
                return (
                  <button key={s} type="button" onClick={() => set('status', s)} style={{
                    padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
                    border: `2px solid ${active ? st.border : 'rgba(61,63,52,0.12)'}`,
                    background: active ? st.bg : 'transparent',
                    color: active ? st.color : '#5f665f',
                    transition: 'all 0.15s',
                  }}>{s}</button>
                );
              })}
            </div>
          </label>

          <label style={{ gridColumn: '1/-1' }}>
            <span style={L}>Task Description</span>
            <textarea rows={3} style={{ ...F, resize: 'vertical' }} value={form.taskDescription} onChange={e => set('taskDescription', e.target.value)} placeholder="Describe the task in detail…" />
          </label>

          <label style={{ gridColumn: '1/-1' }}>
            <span style={L}>Remarks</span>
            <textarea rows={2} style={{ ...F, resize: 'vertical' }} value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Any notes or follow-ups…" />
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22, paddingTop: 18, borderTop: '1px solid rgba(61,63,52,0.1)' }}>
          <button onClick={onClose} style={{ padding: '10px 22px', borderRadius: 12, border: '1px solid rgba(61,63,52,0.18)', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', fontFamily: 'inherit' }}>Cancel</button>
          <button
            onClick={() => { if (form.taskCategory.trim()) onSave(form); }}
            style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: '#0b2b26', color: '#C49B4F', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', fontFamily: 'inherit' }}
          >
            {task?.id ? '💾 Save Changes' : '➕ Add Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function ManagerTaskTracker({ isAdmin = false }) {
  const [activeTab,    setActiveTab]    = useState('common');
  const [tasks,        setTasks]        = useState({ common: INITIAL_COMMON, a_building: INITIAL_A_BUILDING });
  const [modalTask,    setModalTask]    = useState(null);
  const [isLoading,    setIsLoading]    = useState(false);
  const [saveStatus,   setSaveStatus]   = useState('');
  // ── Filtering / Searching / Sorting / Pagination
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [sort,         setSort]         = useState({ key: '_idx', dir: 'asc' });
  const [page,         setPage]         = useState(1);
  const [pageSize,     setPageSize]     = useState(25);
  const unsubRefs = useRef({});

  // ── Reset page on any filter/search/tab change ────────────────────────────────
  useEffect(() => { setPage(1); }, [search, filterStatus, filterPriority, activeTab, sort]);

  // ── Firebase sync ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;
    TABS.forEach(tab => {
      const colName  = `managerTasks_${tab.id}`;
      const fallback = tab.id === 'common' ? INITIAL_COMMON : INITIAL_A_BUILDING;
      setIsLoading(true);
      ensureFirebaseSession().then(() => {
        const unsub = onSnapshot(collection(db, colName),
          snap => {
            if (snap.empty) {
              fallback.forEach(t => {
                const { id, ...data } = t;
                setDoc(doc(db, colName, id), { ...data, updatedAt: serverTimestamp() });
              });
              setTasks(prev => ({ ...prev, [tab.id]: fallback }));
            } else {
              const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
              items.sort((a, b) => a.id > b.id ? 1 : -1);
              setTasks(prev => ({ ...prev, [tab.id]: items }));
            }
            setIsLoading(false);
          },
          err => { console.error(err); setIsLoading(false); }
        );
        unsubRefs.current[tab.id] = unsub;
      });
    });
    return () => Object.values(unsubRefs.current).forEach(u => u?.());
  }, []);

  // ── Save / Delete / QuickStatus ───────────────────────────────────────────────
  const saveTask = useCallback(async (form) => {
    const colName = `managerTasks_${activeTab}`;
    const id = form.id || `${activeTab === 'common' ? 'CT' : 'AB'}-${uid()}`;
    const { id: _id, ...data } = { ...form, id };
    setTasks(prev => {
      const list = [...(prev[activeTab] || [])];
      const idx  = list.findIndex(t => t.id === id);
      if (idx >= 0) list[idx] = { id, ...data }; else list.push({ id, ...data });
      return { ...prev, [activeTab]: list };
    });
    setModalTask(null);
    if (isFirebaseConfigured && db) {
      try {
        await ensureFirebaseSession();
        await setDoc(doc(db, colName, id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
        setSaveStatus('✓ Saved');
      } catch { setSaveStatus('✗ Save failed'); }
    }
    setTimeout(() => setSaveStatus(''), 2500);
  }, [activeTab]);

  const deleteTask = useCallback(async (id) => {
    if (!window.confirm('Delete this task permanently?')) return;
    setTasks(prev => ({ ...prev, [activeTab]: prev[activeTab].filter(t => t.id !== id) }));
    if (isFirebaseConfigured && db) {
      await ensureFirebaseSession();
      await deleteDoc(doc(db, `managerTasks_${activeTab}`, id)).catch(console.error);
    }
  }, [activeTab]);

  const quickStatus = useCallback((id, status) => {
    const task = tasks[activeTab]?.find(t => t.id === id);
    if (task) saveTask({ ...task, status });
  }, [tasks, activeTab, saveTask]);

  // ── Derived data ──────────────────────────────────────────────────────────────
  const currentTasks = tasks[activeTab] || [];

  const stats = useMemo(() => ({
    total:      currentTasks.length,
    done:       currentTasks.filter(t => t.status === 'Done').length,
    inProgress: currentTasks.filter(t => t.status === 'In Progress').length,
    pending:    currentTasks.filter(t => t.status === 'Pending').length,
    onHold:     currentTasks.filter(t => t.status === 'On Hold').length,
    overdue:    currentTasks.filter(t => { const d = calcDaysLeft(t.deadline, t.status); return d !== null && d < 0; }).length,
  }), [currentTasks]);

  const donePercent = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;

  // Search + filter
  const afterFilter = useMemo(() => {
    const q = search.trim().toLowerCase();
    return currentTasks.filter(t => {
      if (filterStatus !== 'All' && t.status !== filterStatus) return false;
      if (filterPriority !== 'All' && t.priority !== filterPriority) return false;
      if (!q) return true;
      return [t.taskCategory, t.area, t.taskDescription, t.vendorName, t.assignedTo, t.remarks]
        .join(' ').toLowerCase().includes(q);
    });
  }, [currentTasks, search, filterStatus, filterPriority]);

  // Sort
  const sorted = useMemo(() => {
    const { key, dir } = sort;
    if (key === '_idx') return afterFilter;
    return [...afterFilter].sort((a, b) => {
      let va = key === '_daysLeft' ? calcDaysLeft(a.deadline, a.status) : (a[key] || '');
      let vb = key === '_daysLeft' ? calcDaysLeft(b.deadline, b.status) : (b[key] || '');
      if (va === null) va = Infinity;
      if (vb === null) vb = Infinity;
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1  : -1;
      return 0;
    });
  }, [afterFilter, sort]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated  = useMemo(() => sorted.slice((page - 1) * pageSize, page * pageSize), [sorted, page, pageSize]);

  const handleSort = (key) => {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  const colCount = COLUMNS.length + (isAdmin ? 1 : 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0b2b26 0%, #196c6c 100%)',
        borderRadius: 20, padding: '20px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 16, boxShadow: '0 6px 28px rgba(11,43,38,0.18)',
      }}>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#C49B4F' }}>Society Manager</p>
          <h2 style={{ margin: '0 0 2px', fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>Task &amp; Deadline Tracker</h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem' }}>Managed by Siddu — Majestique Euriska</p>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { label: 'Total',       value: stats.total,      bg: 'rgba(255,255,255,0.1)',  color: '#fff'     },
            { label: 'Done',        value: stats.done,       bg: 'rgba(110,231,183,0.2)',  color: '#6ee7b7'  },
            { label: 'In Progress', value: stats.inProgress, bg: 'rgba(147,197,253,0.2)',  color: '#93c5fd'  },
            { label: 'Pending',     value: stats.pending,    bg: 'rgba(253,224,71,0.18)',  color: '#fde047'  },
            { label: 'On Hold',     value: stats.onHold,     bg: 'rgba(216,180,254,0.2)',  color: '#d8b4fe'  },
            { label: 'Overdue',     value: stats.overdue,    bg: 'rgba(252,165,165,0.2)',  color: '#fca5a5'  },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', background: s.bg, borderRadius: 10, padding: '8px 14px', minWidth: 52 }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}

          {/* Progress ring area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '8px 14px' }}>
            <div style={{ position: 'relative', width: 44, height: 44 }}>
              <svg width="44" height="44" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
                <circle cx="22" cy="22" r="18" fill="none" stroke="#6ee7b7" strokeWidth="5"
                  strokeDasharray={`${2 * Math.PI * 18}`}
                  strokeDashoffset={`${2 * Math.PI * 18 * (1 - donePercent / 100)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 22 22)"
                  style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#6ee7b7' }}>
                {donePercent}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.2 }}>Completion</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>{stats.done}/{stats.total}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 8 }}>
        {TABS.map(tab => (
          <button key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearch(''); setFilterStatus('All'); setFilterPriority('All'); }}
            style={{
              padding: '9px 18px', borderRadius: 12, border: '2px solid',
              borderColor: activeTab === tab.id ? '#0b2b26' : 'rgba(61,63,52,0.15)',
              cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', fontFamily: 'inherit',
              background: activeTab === tab.id ? '#0b2b26' : 'rgba(255,250,242,0.85)',
              color: activeTab === tab.id ? '#C49B4F' : '#1d2a24',
              boxShadow: activeTab === tab.id ? '0 4px 14px rgba(11,43,38,0.2)' : 'none',
              transition: 'all 0.18s', display: 'flex', alignItems: 'center', gap: 7,
            }}>
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
            <span style={{
              background: activeTab === tab.id ? 'rgba(196,155,79,0.3)' : 'rgba(61,63,52,0.1)',
              color: activeTab === tab.id ? '#C49B4F' : '#5f665f',
              fontSize: '0.72rem', fontWeight: 700, padding: '1px 8px', borderRadius: 10,
            }}>
              {(tasks[tab.id] || []).length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Table Card ── */}
      <div style={{ background: 'rgba(255,250,242,0.95)', border: '1px solid rgba(61,63,52,0.1)', borderRadius: 20, boxShadow: '0 4px 24px rgba(11,43,38,0.06)', overflow: 'hidden' }}>

        {/* ── Toolbar ── */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(61,63,52,0.08)', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>

          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none', fontSize: '0.9rem' }}>🔍</span>
            <input
              type="search"
              placeholder={`Search ${sorted.length} tasks…`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
                borderRadius: 10, border: '1.5px solid rgba(61,63,52,0.15)', background: '#fffefb',
                fontSize: '0.85rem', fontFamily: 'inherit', color: '#1d2a24', outline: 'none',
              }}
            />
          </div>

          {/* Status filter */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {['All', 'Pending', 'In Progress', 'Done', 'On Hold'].map(s => {
              const st = STATUS_STYLE[s];
              const active = filterStatus === s;
              return (
                <button key={s} onClick={() => setFilterStatus(s)} style={{
                  padding: '5px 11px', borderRadius: 20, border: '1.5px solid',
                  fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  background: active ? (st?.bg || '#0b2b26') : 'transparent',
                  color:      active ? (st?.color || '#fff') : '#5f665f',
                  borderColor:active ? (st?.border || '#0b2b26') : 'rgba(61,63,52,0.15)',
                  transition: 'all 0.15s',
                }}>{s}</button>
              );
            })}
          </div>

          {/* Priority filter */}
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{
            padding: '5px 10px', borderRadius: 10, border: '1.5px solid rgba(61,63,52,0.15)',
            background: '#fffefb', fontSize: '0.78rem', fontFamily: 'inherit', cursor: 'pointer', color: '#1d2a24',
          }}>
            <option value="All">All Priorities</option>
            {PRIORITY_OPTIONS.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {/* Spacer + right actions */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {saveStatus && <span style={{ fontSize: '0.8rem', color: saveStatus.includes('✓') ? '#065f46' : '#991b1b', fontWeight: 700 }}>{saveStatus}</span>}

            {/* Page size picker */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: '#5f665f' }}>
              Show
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} style={{ padding: '4px 8px', borderRadius: 8, border: '1.5px solid rgba(61,63,52,0.15)', background: '#fffefb', fontFamily: 'inherit', fontSize: '0.78rem', cursor: 'pointer' }}>
                {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              rows
            </label>

            {isAdmin && (
              <button onClick={() => setModalTask({})} style={{
                padding: '7px 15px', borderRadius: 10, border: 'none',
                background: '#0b2b26', color: '#C49B4F', fontWeight: 700, fontSize: '0.82rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
              }}>➕ Add Task</button>
            )}
          </div>
        </div>

        {/* ── Results info bar ── */}
        {(search || filterStatus !== 'All' || filterPriority !== 'All') && (
          <div style={{ padding: '7px 16px', background: 'rgba(196,155,79,0.08)', borderBottom: '1px solid rgba(196,155,79,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: '0.78rem', color: '#92400e', fontWeight: 600 }}>
              🔎 {sorted.length} result{sorted.length !== 1 ? 's' : ''} found
              {search && <> for "<strong>{search}</strong>"</>}
            </span>
            <button onClick={() => { setSearch(''); setFilterStatus('All'); setFilterPriority('All'); }} style={{ fontSize: '0.75rem', color: '#92400e', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>Clear filters</button>
          </div>
        )}

        {/* ── Table ── */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
            <thead>
              <tr style={{ background: 'rgba(244,239,231,0.95)', position: 'sticky', top: 0, zIndex: 2 }}>
                {COLUMNS.map(col => (
                  <th key={col.key}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                    style={{
                      padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap',
                      fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.07em', color: sort.key === col.key ? '#196c6c' : '#5f665f',
                      borderBottom: '2px solid rgba(61,63,52,0.1)',
                      cursor: col.sortable ? 'pointer' : 'default',
                      userSelect: 'none', minWidth: col.w,
                      background: sort.key === col.key ? 'rgba(25,108,108,0.06)' : undefined,
                      transition: 'background 0.15s',
                    }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {col.label}
                      {col.sortable && <SortIcon dir={sort.key === col.key ? sort.dir : null} />}
                    </span>
                  </th>
                ))}
                {isAdmin && (
                  <th style={{ padding: '10px 12px', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#5f665f', borderBottom: '2px solid rgba(61,63,52,0.1)', whiteSpace: 'nowrap', minWidth: 90 }}>Actions</th>
                )}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr><td colSpan={colCount} style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#5f665f', opacity: 0.7 }}>
                    <div style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }}>⏳</div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading tasks…</span>
                  </div>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={colCount} style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#5f665f', opacity: 0.6 }}>
                    <div style={{ fontSize: '2.5rem' }}>📭</div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>No tasks match your filters</span>
                  </div>
                </td></tr>
              ) : (
                paginated.map((task, idx) => {
                  const globalIdx = (page - 1) * pageSize + idx + 1;
                  const daysLeft  = calcDaysLeft(task.deadline, task.status);
                  const isDone    = task.status === 'Done';
                  const isOverdue = daysLeft !== null && daysLeft < 0;

                  const rowBg = isDone ? 'rgba(209,250,229,0.2)' : isOverdue ? 'rgba(254,226,226,0.28)' : 'transparent';

                  return (
                    <tr key={task.id} style={{ borderBottom: '1px solid rgba(61,63,52,0.06)', background: rowBg, transition: 'background 0.12s' }}
                      onMouseEnter={e => { if (!isDone && !isOverdue) e.currentTarget.style.background = 'rgba(244,239,231,0.55)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = rowBg; }}>

                      {/* # */}
                      <td style={{ padding: '9px 12px', fontSize: '0.73rem', color: '#c4b99a', fontWeight: 700, textAlign: 'right', paddingRight: 8 }}>
                        {globalIdx}
                      </td>

                      {/* Task Category */}
                      <td style={{ padding: '9px 12px', minWidth: 160 }}>
                        <strong style={{ fontSize: '0.85rem', display: 'block', color: '#1d2a24', lineHeight: 1.35 }}>
                          {highlight(task.taskCategory, search) || '—'}
                        </strong>
                        <span style={{ fontSize: '0.68rem', color: '#c4b99a', marginTop: 1, display: 'block' }}>{task.id}</span>
                      </td>

                      {/* Area */}
                      <td style={{ padding: '9px 12px', fontSize: '0.8rem', color: '#5f665f', whiteSpace: 'nowrap' }}>
                        {task.area || <span style={{ color: '#c4b99a' }}>—</span>}
                      </td>

                      {/* Description */}
                      <td style={{ padding: '9px 12px', maxWidth: 240 }}>
                        <span style={{ fontSize: '0.8rem', color: '#3d4534', lineHeight: 1.45,
                          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {highlight(task.taskDescription, search) || <span style={{ color: '#c4b99a' }}>—</span>}
                        </span>
                      </td>

                      {/* Vendor */}
                      <td style={{ padding: '9px 12px', fontSize: '0.8rem', color: '#5f665f' }}>
                        {highlight(task.vendorName, search) || <span style={{ color: '#c4b99a' }}>—</span>}
                      </td>

                      {/* Assigned To */}
                      <td style={{ padding: '9px 12px' }}>
                        {task.assignedTo
                          ? <span style={{ display: 'inline-block', fontSize: '0.73rem', fontWeight: 700, background: '#e3efe5', color: '#31553e', padding: '2px 9px', borderRadius: 20 }}>{task.assignedTo}</span>
                          : <span style={{ color: '#c4b99a', fontSize: '0.78rem' }}>—</span>}
                      </td>

                      {/* Start Date */}
                      <td style={{ padding: '9px 12px', fontSize: '0.78rem', color: '#5f665f', whiteSpace: 'nowrap' }}>{fmtDate(task.startDate)}</td>

                      {/* Deadline */}
                      <td style={{ padding: '9px 12px', fontSize: '0.78rem', whiteSpace: 'nowrap', fontWeight: isOverdue ? 700 : 400, color: isOverdue ? '#991b1b' : '#5f665f' }}>{fmtDate(task.deadline)}</td>

                      {/* Priority */}
                      <td style={{ padding: '9px 12px' }}><Pill text={task.priority} styleMap={PRIORITY_STYLE} /></td>

                      {/* Status */}
                      <td style={{ padding: '9px 12px' }}>
                        {isAdmin
                          ? <select value={task.status || ''} onChange={e => quickStatus(task.id, e.target.value)} style={{
                              padding: '3px 7px', borderRadius: 8, border: '1.5px solid',
                              borderColor: STATUS_STYLE[task.status]?.border || 'rgba(61,63,52,0.15)',
                              background:  STATUS_STYLE[task.status]?.bg    || '#fff',
                              color:       STATUS_STYLE[task.status]?.color || '#1d2a24',
                              fontWeight: 600, fontSize: '0.73rem', cursor: 'pointer', fontFamily: 'inherit',
                            }}>
                              {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o || '—'}</option>)}
                            </select>
                          : <Pill text={task.status} styleMap={STATUS_STYLE} />}
                      </td>

                      {/* Days Left */}
                      <td style={{ padding: '9px 12px' }}><DaysChip days={daysLeft} /></td>

                      {/* Remarks */}
                      <td style={{ padding: '9px 12px', fontSize: '0.78rem', color: '#5f665f', minWidth: 100 }}>
                        {task.remarks || <span style={{ color: '#c4b99a' }}>—</span>}
                      </td>

                      {/* Actions */}
                      {isAdmin && (
                        <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button onClick={() => setModalTask(task)} title="Edit" style={{ padding: '3px 8px', borderRadius: 7, border: '1px solid rgba(61,63,52,0.15)', background: '#fff', cursor: 'pointer', fontSize: '0.75rem' }}>✏️</button>
                            <button onClick={() => deleteTask(task.id)} title="Delete" style={{ padding: '3px 8px', borderRadius: 7, border: '1px solid rgba(220,38,38,0.2)', background: '#fff0f0', color: '#dc2626', cursor: 'pointer', fontSize: '0.75rem' }}>🗑️</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination footer ── */}
        <div style={{
          padding: '10px 16px', borderTop: '1px solid rgba(61,63,52,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
        }}>
          {/* Info */}
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
            {sorted.length === 0 ? 'No results' : `Showing ${((page - 1) * pageSize) + 1}–${Math.min(page * pageSize, sorted.length)} of ${sorted.length} tasks`}
            {sorted.length !== currentTasks.length && ` (filtered from ${currentTasks.length})`}
          </span>

          {/* Page controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <button onClick={() => setPage(1)} disabled={page === 1} style={pgBtn(page === 1)}>«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pgBtn(page === 1)}>‹</button>

              {/* Page number pills */}
              {getPageRange(page, totalPages).map((p, i) =>
                p === '…' ? (
                  <span key={`gap-${i}`} style={{ padding: '0 4px', color: '#9ca3af', fontSize: '0.78rem' }}>…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p)} style={{
                    ...pgBtn(false),
                    background: page === p ? '#0b2b26' : undefined,
                    color:      page === p ? '#C49B4F' : undefined,
                    fontWeight: page === p ? 700 : 500,
                  }}>{p}</button>
                )
              )}

              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pgBtn(page === totalPages)}>›</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={pgBtn(page === totalPages)}>»</button>

              <span style={{ fontSize: '0.73rem', color: '#9ca3af', marginLeft: 4 }}>of {totalPages}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      {modalTask !== null && (
        <TaskModal
          task={modalTask?.id ? modalTask : null}
          onSave={saveTask}
          onClose={() => setModalTask(null)}
        />
      )}
    </div>
  );
}

// ─── Pagination helpers ─────────────────────────────────────────────────────────
function pgBtn(disabled) {
  return {
    padding: '4px 9px', borderRadius: 8, border: '1.5px solid rgba(61,63,52,0.15)',
    background: '#fffefb', cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '0.78rem', fontFamily: 'inherit', fontWeight: 500,
    color: disabled ? '#c4b99a' : '#1d2a24', opacity: disabled ? 0.45 : 1,
    transition: 'all 0.15s',
  };
}

function getPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push('…', total);
  } else if (current >= total - 3) {
    pages.push(1, '…');
    for (let i = total - 4; i <= total; i++) pages.push(i);
  } else {
    pages.push(1, '…', current - 1, current, current + 1, '…', total);
  }
  return pages;
}
