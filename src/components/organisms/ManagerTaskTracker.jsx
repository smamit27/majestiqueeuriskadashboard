import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';
import './ManagerTaskTracker.css';


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
  { id:'AB-002', taskCategory:'Tenant Rent Agreement: 506 & 1008', area:'A Building', taskDescription:'Tenant Rent agreement for Flat 506 and Flat 1008', vendorName:'', assignedTo:'Siddu', startDate:'2026-10-01', deadline:'', priority:'High', status:'Pending', remarks:'' },
  { id:'AB-003', taskCategory:'Flat No 403 Owner Talk', area:'A Building', taskDescription:'Discussion with Flat 403 owner regarding pending matters', vendorName:'', assignedTo:'Siddu', startDate:'2026-10-01', deadline:'', priority:'Medium', status:'Pending', remarks:'' },
  { id:'AB-004', taskCategory:'Pending Painting Work: 1004', area:'A Building', taskDescription:'Pending painting work of Flat 1004', vendorName:'', assignedTo:'Siddu', startDate:'2026-10-01', deadline:'', priority:'Medium', status:'Pending', remarks:'' },
  { id:'AB-005', taskCategory:'Send Notice to Shop Owners', area:'A Building', taskDescription:'Send official notice to all shop owners', vendorName:'', assignedTo:'Siddu', startDate:'2026-10-01', deadline:'', priority:'High', status:'Pending', remarks:'' },
  { id:'AB-006', taskCategory:'Parking Allotment Letter', area:'A Building', taskDescription:'Issue parking allotment letters to residents', vendorName:'', assignedTo:'Siddu', startDate:'2026-10-01', deadline:'2026-10-10', priority:'High', status:'Pending', remarks:'Deadline: 10th October 2026' },
  { id:'AB-007', taskCategory:'Cockroach/Rat Pest Control', area:'A Building', taskDescription:'Arrange cockroach and rat pest control treatment for the building', vendorName:'', assignedTo:'Siddu', startDate:'2026-10-01', deadline:'', priority:'Medium', status:'Pending', remarks:'' },
  { id:'AB-008', taskCategory:'Solar Discussion', area:'A Building', taskDescription:'Solar panel installation discussion and planning', vendorName:'', assignedTo:'Siddu', startDate:'2026-10-01', deadline:'2026-12-01', priority:'Medium', status:'Pending', remarks:'Max deadline: next 2 months' },
  { id:'AB-009', taskCategory:'Builder Discussion', area:'A Building', taskDescription:'Discussion with builder regarding pending issues', vendorName:'', assignedTo:'Siddu', startDate:'2026-10-01', deadline:'2026-12-01', priority:'Medium', status:'Pending', remarks:'Max deadline: next 2 months' },
  { id:'AB-010', taskCategory:'Appointment of Auditor', area:'A Building', taskDescription:'Appointment of auditor for society accounts and compliance', vendorName:'', assignedTo:'Siddu', startDate:'2026-10-01', deadline:'', priority:'High', status:'Pending', remarks:'' },
  { id:'AB-011', taskCategory:'Committee Role Assignment Discussion', area:'A Building', taskDescription:'Discussion on committee role assignments and responsibilities', vendorName:'', assignedTo:'Siddu', startDate:'2026-10-01', deadline:'', priority:'Medium', status:'Pending', remarks:'' },
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
      <mark className="manager-task-tracker-s1">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ─── Mini components ────────────────────────────────────────────────────────────
function Pill({ text, styleMap }) {
  const s = styleMap?.[text];
  if (!s || !text) return <span className="manager-task-tracker-s2">—</span>;
  return (
    <span className="manager-task-tracker-s3" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{text}</span>
  );
}

function DaysChip({ days }) {
  if (days === null) return <span className="manager-task-tracker-s2">—</span>;
  const color = days < 0 ? '#991b1b' : days <= 3 ? '#d97706' : '#065f46';
  const bg    = days < 0 ? '#fee2e2' : days <= 3 ? '#fef3c7' : '#d1fae5';
  const label = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today!' : `${days}d left`;
  return (
    <span className="manager-task-tracker-s4" style={{ background: bg, color }}>
      {days < 0 && <span>⚠</span>}
      {label}
    </span>
  );
}

function SortIcon({ dir }) {
  if (!dir) return <span className="manager-task-tracker-s5">⇅</span>;
  return <span className="manager-task-tracker-s6">{dir === 'asc' ? '↑' : '↓'}</span>;
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
    <div className="manager-task-tracker-s7"
      onClick={onClose}>
      <div className="manager-task-tracker-s8"
        onClick={e => e.stopPropagation()}>

        {/* Modal header */}
        <div className="manager-task-tracker-s9">
          <div>
            <p className="manager-task-tracker-s10">
              {task?.id ? 'Edit Task' : 'New Task'}
            </p>
            <h3 className="manager-task-tracker-s11">
              {task?.id ? task.taskCategory || 'Edit Task' : '➕ Add New Task'}
            </h3>
          </div>
          <button onClick={onClose} className="manager-task-tracker-s12">✕</button>
        </div>

        <div className="manager-task-tracker-s13">
          {/* Full-width fields */}
          <label className="manager-task-tracker-s14">
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

          <label className="manager-task-tracker-s14">
            <span style={L}>Status</span>
            <div className="manager-task-tracker-s15">
              {STATUS_OPTIONS.filter(Boolean).map(s => {
                const st = STATUS_STYLE[s];
                const active = form.status === s;
                return (
                  <button key={s} type="button" onClick={() => set('status', s)} className="manager-task-tracker-s16" style={{ border: `2px solid ${active ? st.border : 'rgba(61,63,52,0.12)'}`, background: active ? st.bg : 'transparent', color: active ? st.color : '#5f665f' }}>{s}</button>
                );
              })}
            </div>
          </label>

          <label className="manager-task-tracker-s14">
            <span style={L}>Task Description</span>
            <textarea rows={3} className="manager-task-tracker-s17" style={{ ...F }} value={form.taskDescription} onChange={e => set('taskDescription', e.target.value)} placeholder="Describe the task in detail…" />
          </label>

          <label className="manager-task-tracker-s14">
            <span style={L}>Remarks</span>
            <textarea rows={2} className="manager-task-tracker-s17" style={{ ...F }} value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Any notes or follow-ups…" />
          </label>
        </div>

        <div className="manager-task-tracker-s18">
          <button onClick={onClose} className="manager-task-tracker-s19">Cancel</button>
          <button
            onClick={() => { if (form.taskCategory.trim()) onSave(form); }}
            className="manager-task-tracker-s20"
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
              // Collection is empty → seed all initial tasks
              fallback.forEach(t => {
                const { id, ...data } = t;
                setDoc(doc(db, colName, id), { ...data, updatedAt: serverTimestamp() });
              });
              setTasks(prev => ({ ...prev, [tab.id]: fallback }));
            } else {
              const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
              // Merge any missing seed tasks into Firestore
              const existingIds = new Set(items.map(i => i.id));
              fallback.forEach(t => {
                if (!existingIds.has(t.id)) {
                  const { id, ...data } = t;
                  setDoc(doc(db, colName, id), { ...data, updatedAt: serverTimestamp() });
                  items.push(t);
                }
              });
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

  // ── Export CSV ────────────────────────────────────────────────────────────────
  const handleExportCSV = useCallback(() => {
    const listToExport = sorted.length > 0 ? sorted : currentTasks;
    const tabName = activeTab === 'common' ? 'Common_Work' : 'A_Building_Work';
    const headers = 'Task ID,Task Category,Area,Task Description,Vendor Name,Assigned To,Start Date,Deadline,Priority,Status,Days Left,Remarks\n';
    const rows = listToExport.map(t => {
      const daysLeft = calcDaysLeft(t.deadline, t.status);
      const daysStr = daysLeft !== null ? (daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`) : '';
      const cat = (t.taskCategory || '').replace(/"/g, '""');
      const area = (t.area || '').replace(/"/g, '""');
      const desc = (t.taskDescription || '').replace(/"/g, '""');
      const vendor = (t.vendorName || '').replace(/"/g, '""');
      const assigned = (t.assignedTo || '').replace(/"/g, '""');
      const remarks = (t.remarks || '').replace(/"/g, '""');
      return `"${t.id}","${cat}","${area}","${desc}","${vendor}","${assigned}","${t.startDate || ''}","${t.deadline || ''}","${t.priority || ''}","${t.status || ''}","${daysStr}","${remarks}"`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Majestique_Euriska_${tabName}_Tasks.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [sorted, currentTasks, activeTab]);

  // ── Export Dedicated Print PDF ───────────────────────────────────────────────
  const handleExportPDF = useCallback(() => {
    const listToPrint = sorted.length > 0 ? sorted : currentTasks;
    const generatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const tabLabel = activeTab === 'common' ? 'Common Society Work' : 'A Building Work';
    
    const doneCount = listToPrint.filter(t => t.status === 'Done').length;
    const inProgCount = listToPrint.filter(t => t.status === 'In Progress').length;
    const pendingCount = listToPrint.filter(t => t.status === 'Pending').length;
    const onHoldCount = listToPrint.filter(t => t.status === 'On Hold').length;
    const overdueCount = listToPrint.filter(t => {
      const d = calcDaysLeft(t.deadline, t.status);
      return d !== null && d < 0;
    }).length;

    const printDoc = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Majestique Euriska - ${tabLabel} - Task & Deadline Ledger</title>
        <style>
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          body { margin: 0; padding: 24px; color: #0f172a; background: #ffffff; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
          .subtitle { font-size: 13px; color: #475569; margin-top: 4px; }
          .meta { font-size: 11px; color: #475569; text-align: right; }
          
          .summary-bar {
            display: flex;
            gap: 16px;
            margin-bottom: 16px;
            padding: 10px 14px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            font-size: 12px;
            flex-wrap: wrap;
          }
          .summary-item { font-weight: 600; color: #334155; }
          .summary-item strong { color: #0f172a; }
          
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #f1f5f9; color: #1e293b; font-weight: 700; text-align: left; padding: 8px 10px; border: 1px solid #94a3b8; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
          td { padding: 7px 10px; border: 1px solid #cbd5e1; color: #0f172a; vertical-align: top; }
          tr:nth-child(even) { background: #f8fafc; }
          
          .pill {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 700;
            white-space: nowrap;
          }
          .pill-done { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
          .pill-inprogress { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
          .pill-pending { background: #fefce8; color: #854d0e; border: 1px solid #fef08a; }
          .pill-onhold { background: #faf5ff; color: #6b21a8; border: 1px solid #e9d5ff; }
          
          .pill-p-high { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
          .pill-p-medium { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
          .pill-p-low { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
          
          .days-chip {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 8px;
            font-size: 10px;
            font-weight: 700;
            white-space: nowrap;
          }
          .days-overdue { background: #fee2e2; color: #991b1b; }
          .days-soon { background: #fef3c7; color: #d97706; }
          .days-ok { background: #d1fae5; color: #065f46; }

          .footer {
            margin-top: 24px;
            border-top: 1px solid #cbd5e1;
            padding-top: 10px;
            font-size: 10px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
          }
          
          @media print {
            body { padding: 0; }
            @page { margin: 1cm; size: A4 landscape; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">📋 MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.</h1>
            <div class="subtitle">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, Pune - 411060</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${tabLabel} — Society Manager Task &amp; Deadline Ledger</div>
          </div>
          <div class="meta">
            <div><strong>Report Date:</strong> ${generatedDate}</div>
            <div><strong>Filter Scope:</strong> ${filterStatus === 'All' ? 'All Statuses' : filterStatus} • ${filterPriority === 'All' ? 'All Priorities' : filterPriority + ' Priority'}${search ? ` • Search: "${search}"` : ''} (${listToPrint.length} Tasks)</div>
          </div>
        </div>

        <div class="summary-bar">
          <div class="summary-item">Total Tasks: <strong>${listToPrint.length}</strong></div>
          <div>•</div>
          <div class="summary-item" style="color: #065f46;">Done: <strong>${doneCount} (${listToPrint.length ? Math.round((doneCount / listToPrint.length) * 100) : 0}%)</strong></div>
          <div>•</div>
          <div class="summary-item" style="color: #1e40af;">In Progress: <strong>${inProgCount}</strong></div>
          <div>•</div>
          <div class="summary-item" style="color: #854d0e;">Pending: <strong>${pendingCount}</strong></div>
          ${onHoldCount > 0 ? `<div>•</div><div class="summary-item" style="color: #6b21a8;">On Hold: <strong>${onHoldCount}</strong></div>` : ''}
          ${overdueCount > 0 ? `<div>•</div><div class="summary-item" style="color: #991b1b;">Overdue: <strong>${overdueCount}</strong></div>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">#</th>
              <th style="width: 150px;">Task Category & ID</th>
              <th style="width: 100px;">Area</th>
              <th>Task Description</th>
              <th style="width: 100px;">Vendor</th>
              <th style="width: 90px;">Assigned</th>
              <th style="width: 80px;">Start Date</th>
              <th style="width: 80px;">Deadline</th>
              <th style="width: 75px; text-align: center;">Priority</th>
              <th style="width: 85px; text-align: center;">Status</th>
              <th style="width: 85px; text-align: center;">Due In</th>
              <th style="width: 120px;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${listToPrint.map((task, index) => {
              const daysLeft = calcDaysLeft(task.deadline, task.status);
              const pillStatusClass = task.status === 'Done'
                ? 'pill-done'
                : task.status === 'In Progress'
                ? 'pill-inprogress'
                : task.status === 'On Hold'
                ? 'pill-onhold'
                : 'pill-pending';

              const pillPriorityClass = task.priority === 'High'
                ? 'pill-p-high'
                : task.priority === 'Medium'
                ? 'pill-p-medium'
                : task.priority === 'Low'
                ? 'pill-p-low'
                : '';

              let daysChipHtml = '—';
              if (daysLeft !== null) {
                const chipClass = daysLeft < 0 ? 'days-overdue' : daysLeft <= 3 ? 'days-soon' : 'days-ok';
                const label = daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Today!' : `${daysLeft}d left`;
                daysChipHtml = `<span class="days-chip ${chipClass}">${daysLeft < 0 ? '⚠ ' : ''}${label}</span>`;
              }

              return `
                <tr>
                  <td style="text-align: center; color: #64748b; font-weight: 600;">${index + 1}</td>
                  <td>
                    <strong style="color: #0f172a;">${task.taskCategory || '—'}</strong>
                    <div style="font-size: 9px; color: #64748b; font-family: monospace;">${task.id}</div>
                  </td>
                  <td>${task.area || '—'}</td>
                  <td>${task.taskDescription || '—'}</td>
                  <td>${task.vendorName || '—'}</td>
                  <td>${task.assignedTo ? `<span style="font-weight: 600;">${task.assignedTo}</span>` : '—'}</td>
                  <td>${fmtDate(task.startDate)}</td>
                  <td>${fmtDate(task.deadline)}</td>
                  <td style="text-align: center;">
                    ${task.priority ? `<span class="pill ${pillPriorityClass}">${task.priority}</span>` : '—'}
                  </td>
                  <td style="text-align: center;">
                    <span class="pill ${pillStatusClass}">${task.status || 'Pending'}</span>
                  </td>
                  <td style="text-align: center;">${daysChipHtml}</td>
                  <td style="font-size: 10px; color: #475569;">${task.remarks || '—'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="footer">
          <div>Majestique Euriska Co-Op Housing Society • Task & Deadline Management Ledger</div>
          <div>Confidential Document</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printDoc);
      printWindow.document.close();
    } else {
      window.print();
    }
  }, [sorted, currentTasks, activeTab, filterStatus, filterPriority, search]);

  // ─── Render ──────────────────────────────────────────────────────────────────
  const colCount = COLUMNS.length + (isAdmin ? 1 : 0);

  return (
    <div className="manager-task-tracker-s21">

      {/* ── Banner ── */}
      <div className="manager-task-tracker-s22">
        <div>
          <p className="manager-task-tracker-s23">Society Manager</p>
          <h2 className="manager-task-tracker-s24">Task &amp; Deadline Tracker</h2>
          <p className="manager-task-tracker-s25">Managed by Siddu — Majestique Euriska</p>
        </div>

        {/* Stats row */}
        <div className="manager-task-tracker-s26">
          {[
            { label: 'Total',       value: stats.total,      bg: 'rgba(255,255,255,0.1)',  color: '#fff'     },
            { label: 'Done',        value: stats.done,       bg: 'rgba(110,231,183,0.2)',  color: '#6ee7b7'  },
            { label: 'In Progress', value: stats.inProgress, bg: 'rgba(147,197,253,0.2)',  color: '#93c5fd'  },
            { label: 'Pending',     value: stats.pending,    bg: 'rgba(253,224,71,0.18)',  color: '#fde047'  },
            { label: 'On Hold',     value: stats.onHold,     bg: 'rgba(216,180,254,0.2)',  color: '#d8b4fe'  },
            { label: 'Overdue',     value: stats.overdue,    bg: 'rgba(252,165,165,0.2)',  color: '#fca5a5'  },
          ].map(s => (
            <div key={s.label} className="manager-task-tracker-s27" style={{ background: s.bg }}>
              <div className="manager-task-tracker-s28" style={{ color: s.color }}>{s.value}</div>
              <div className="manager-task-tracker-s29">{s.label}</div>
            </div>
          ))}

          {/* Progress ring area */}
          <div className="manager-task-tracker-s30">
            <div className="manager-task-tracker-s31">
              <svg width="44" height="44" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
                <circle cx="22" cy="22" r="18" fill="none" stroke="#6ee7b7" strokeWidth="5"
                  strokeDasharray={`${2 * Math.PI * 18}`}
                  strokeDashoffset={`${2 * Math.PI * 18 * (1 - donePercent / 100)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 22 22)"
                  className="manager-task-tracker-s32"
                />
              </svg>
              <div className="manager-task-tracker-s33">
                {donePercent}%
              </div>
            </div>
            <div>
              <div className="manager-task-tracker-s34">Completion</div>
              <div className="manager-task-tracker-s35">{stats.done}/{stats.total}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Workflow Engine Promotion Banner ── */}
      <div className="manager-task-tracker-s36">
        <div className="manager-task-tracker-s37">
          <span className="manager-task-tracker-s38">⚡</span>
          <div>
            <div className="manager-task-tracker-s39">
              Full Society Project &amp; Approval Workflow Engine Active
            </div>
            <div className="manager-task-tracker-s40">
              Includes 10-state lifecycle (Draft → In Review → Approved), Kanban board, milestones, blocker risks &amp; committee approval gates.
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.set('tab', 'project_workflow');
              window.location.href = url.toString();
            }
          }}
          className="manager-task-tracker-s41"
        >
          Open Workflow Engine →
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="manager-task-tracker-s42">
        {TABS.map(tab => (
          <button key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearch(''); setFilterStatus('All'); setFilterPriority('All'); }}
            className="manager-task-tracker-s43" style={{ borderColor: activeTab === tab.id ? '#0b2b26' : 'rgba(61,63,52,0.15)', background: activeTab === tab.id ? '#0b2b26' : 'rgba(255,250,242,0.85)', color: activeTab === tab.id ? '#C49B4F' : '#1d2a24', boxShadow: activeTab === tab.id ? '0 4px 14px rgba(11,43,38,0.2)' : 'none' }}>
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
            <span className="manager-task-tracker-s44" style={{ background: activeTab === tab.id ? 'rgba(196,155,79,0.3)' : 'rgba(61,63,52,0.1)', color: activeTab === tab.id ? '#C49B4F' : '#5f665f' }}>
              {(tasks[tab.id] || []).length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Table Card ── */}
      <div className="manager-task-tracker-s45">

        {/* ── Toolbar ── */}
        <div className="manager-task-tracker-s46">

          {/* Search */}
          <div className="manager-task-tracker-s47">
            <span className="manager-task-tracker-s48">🔍</span>
            <input
              type="search"
              placeholder={`Search ${sorted.length} tasks…`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="manager-task-tracker-s49"
            />
          </div>

          {/* Status filter */}
          <div className="manager-task-tracker-s50">
            {['All', 'Pending', 'In Progress', 'Done', 'On Hold'].map(s => {
              const st = STATUS_STYLE[s];
              const active = filterStatus === s;
              return (
                <button key={s} onClick={() => setFilterStatus(s)} className="manager-task-tracker-s51" style={{ background: active ? (st?.bg || '#0b2b26') : 'transparent', color:      active ? (st?.color || '#fff') : '#5f665f', borderColor:active ? (st?.border || '#0b2b26') : 'rgba(61,63,52,0.15)' }}>{s}</button>
              );
            })}
          </div>

          {/* Priority filter */}
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="manager-task-tracker-s52">
            <option value="All">All Priorities</option>
            {PRIORITY_OPTIONS.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {/* Spacer + right actions */}
          <div className="manager-task-tracker-s53">
            <button
              onClick={handleExportCSV}
              className="manager-task-tracker-s54"
              title="Export tasks to CSV"
            >
              📥 Export CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="manager-task-tracker-s54"
              title="Print or export as PDF"
            >
              📄 Print PDF
            </button>

            {saveStatus && <span className="manager-task-tracker-s55" style={{ color: saveStatus.includes('✓') ? '#065f46' : '#991b1b' }}>{saveStatus}</span>}

            {/* Page size picker */}
            <label className="manager-task-tracker-s56">
              Show
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="manager-task-tracker-s57">
                {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              rows
            </label>

            {isAdmin && (
              <button onClick={() => setModalTask({})} className="manager-task-tracker-s58">➕ Add Task</button>
            )}
          </div>
        </div>

        {/* ── Results info bar ── */}
        {(search || filterStatus !== 'All' || filterPriority !== 'All') && (
          <div className="manager-task-tracker-s59">
            <span className="manager-task-tracker-s60">
              🔎 {sorted.length} result{sorted.length !== 1 ? 's' : ''} found
              {search && <> for "<strong>{search}</strong>"</>}
            </span>
            <button onClick={() => { setSearch(''); setFilterStatus('All'); setFilterPriority('All'); }} className="manager-task-tracker-s61">Clear filters</button>
          </div>
        )}

        {/* ── Table ── */}
        <div className="manager-task-tracker-s62">
          <table className="manager-task-tracker-s63">
            <thead>
              <tr className="manager-task-tracker-s64">
                {COLUMNS.map(col => (
                  <th key={col.key}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                    className="manager-task-tracker-s65" style={{ color: sort.key === col.key ? '#196c6c' : '#5f665f', cursor: col.sortable ? 'pointer' : 'default', minWidth: col.w, background: sort.key === col.key ? 'rgba(25,108,108,0.06)' : undefined }}>
                    <span className="manager-task-tracker-s66">
                      {col.label}
                      {col.sortable && <SortIcon dir={sort.key === col.key ? sort.dir : null} />}
                    </span>
                  </th>
                ))}
                {isAdmin && (
                  <th className="manager-task-tracker-s67">Actions</th>
                )}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr><td colSpan={colCount} className="manager-task-tracker-s68">
                  <div className="manager-task-tracker-s69">
                    <div className="manager-task-tracker-s70">⏳</div>
                    <span className="manager-task-tracker-s71">Loading tasks…</span>
                  </div>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={colCount} className="manager-task-tracker-s68">
                  <div className="manager-task-tracker-s72">
                    <div className="manager-task-tracker-s73">📭</div>
                    <span className="manager-task-tracker-s71">No tasks match your filters</span>
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
                    <tr key={task.id} className="manager-task-tracker-s74" style={{ background: rowBg }}
                      onMouseEnter={e => { if (!isDone && !isOverdue) e.currentTarget.style.background = 'rgba(244,239,231,0.55)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = rowBg; }}>

                      {/* # */}
                      <td className="manager-task-tracker-s75">
                        {globalIdx}
                      </td>

                      {/* Task Category */}
                      <td className="manager-task-tracker-s76">
                        <strong className="manager-task-tracker-s77">
                          {highlight(task.taskCategory, search) || '—'}
                        </strong>
                        <span className="manager-task-tracker-s78">{task.id}</span>
                      </td>

                      {/* Area */}
                      <td className="manager-task-tracker-s79">
                        {task.area || <span className="manager-task-tracker-s80">—</span>}
                      </td>

                      {/* Description */}
                      <td className="manager-task-tracker-s81">
                        <span className="manager-task-tracker-s82">
                          {highlight(task.taskDescription, search) || <span className="manager-task-tracker-s80">—</span>}
                        </span>
                      </td>

                      {/* Vendor */}
                      <td className="manager-task-tracker-s83">
                        {highlight(task.vendorName, search) || <span className="manager-task-tracker-s80">—</span>}
                      </td>

                      {/* Assigned To */}
                      <td className="manager-task-tracker-s84">
                        {task.assignedTo
                          ? <span className="manager-task-tracker-s85">{task.assignedTo}</span>
                          : <span className="manager-task-tracker-s2">—</span>}
                      </td>

                      {/* Start Date */}
                      <td className="manager-task-tracker-s86">{fmtDate(task.startDate)}</td>

                      {/* Deadline */}
                      <td className="manager-task-tracker-s87" style={{ fontWeight: isOverdue ? 700 : 400, color: isOverdue ? '#991b1b' : '#5f665f' }}>{fmtDate(task.deadline)}</td>

                      {/* Priority */}
                      <td className="manager-task-tracker-s84"><Pill text={task.priority} styleMap={PRIORITY_STYLE} /></td>

                      {/* Status */}
                      <td className="manager-task-tracker-s84">
                        {isAdmin
                          ? <select value={task.status || ''} onChange={e => quickStatus(task.id, e.target.value)} className="manager-task-tracker-s88" style={{ borderColor: STATUS_STYLE[task.status]?.border || 'rgba(61,63,52,0.15)', background:  STATUS_STYLE[task.status]?.bg    || '#fff', color:       STATUS_STYLE[task.status]?.color || '#1d2a24' }}>
                              {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o || '—'}</option>)}
                            </select>
                          : <Pill text={task.status} styleMap={STATUS_STYLE} />}
                      </td>

                      {/* Days Left */}
                      <td className="manager-task-tracker-s84"><DaysChip days={daysLeft} /></td>

                      {/* Remarks */}
                      <td className="manager-task-tracker-s89">
                        {task.remarks || <span className="manager-task-tracker-s80">—</span>}
                      </td>

                      {/* Actions */}
                      {isAdmin && (
                        <td className="manager-task-tracker-s90">
                          <div className="manager-task-tracker-s91">
                            <button onClick={() => setModalTask(task)} title="Edit" className="manager-task-tracker-s92">✏️</button>
                            <button onClick={() => deleteTask(task.id)} title="Delete" className="manager-task-tracker-s93">🗑️</button>
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
        <div className="manager-task-tracker-s94">
          {/* Info */}
          <span className="manager-task-tracker-s95">
            {sorted.length === 0 ? 'No results' : `Showing ${((page - 1) * pageSize) + 1}–${Math.min(page * pageSize, sorted.length)} of ${sorted.length} tasks`}
            {sorted.length !== currentTasks.length && ` (filtered from ${currentTasks.length})`}
          </span>

          {/* Page controls */}
          {totalPages > 1 && (
            <div className="manager-task-tracker-s96">
              <button onClick={() => setPage(1)} disabled={page === 1} style={pgBtn(page === 1)}>«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pgBtn(page === 1)}>‹</button>

              {/* Page number pills */}
              {getPageRange(page, totalPages).map((p, i) =>
                p === '…' ? (
                  <span key={`gap-${i}`} className="manager-task-tracker-s97">…</span>
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

              <span className="manager-task-tracker-s98">of {totalPages}</span>
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
