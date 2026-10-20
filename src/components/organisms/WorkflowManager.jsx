import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckCircle2, Clock, AlertTriangle, Plus, Search,
  Calendar, User, RefreshCw, FileText, Download, Briefcase, Layers,
  Eye, Edit3, X, Check, AlertOctagon, TrendingUp, Award, Presentation
} from 'lucide-react';
import InPortalDocumentViewer from './InPortalDocumentViewer.jsx';
import {
  WORKFLOW_STATUS,
  WORKFLOW_PRIORITY,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  VALID_TRANSITIONS,
  APPROVER_ROLES,
  validateStatusTransition,
  calculateWorkflowMetrics,
  loadWorkflowProjects,
  loadWorkflowTasks,
  saveWorkflowProject,
  saveWorkflowTask,
  deleteWorkflowTask
} from '../../services/workflowService.js';
import { ROLES } from '../../services/rbacService.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
function calcDaysLeft(deadline, status) {
  if (!deadline || [WORKFLOW_STATUS.COMPLETED, WORKFLOW_STATUS.CANCELLED].includes(status)) return null;
  const target = new Date(deadline);
  if (isNaN(target.getTime())) return null;
  return Math.ceil((target - new Date()) / 86400000);
}

function formatDate(val) {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return val;
  }
}

function formatCurrency(val) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val || 0);
}

// ── Components: Status Badge & Chips ─────────────────────────────────────────
export function WorkflowStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG[WORKFLOW_STATUS.DRAFT];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 10px',
        borderRadius: '20px',
        fontSize: '0.75rem',
        fontWeight: 700,
        letterSpacing: '0.02em',
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        whiteSpace: 'nowrap'
      }}
    >
      {status === WORKFLOW_STATUS.COMPLETED && <CheckCircle2 size={12} />}
      {status === WORKFLOW_STATUS.IN_PROGRESS && <Clock size={12} />}
      {status === WORKFLOW_STATUS.BLOCKED && <AlertTriangle size={12} />}
      {status === WORKFLOW_STATUS.IN_REVIEW && <Eye size={12} />}
      {status}
    </span>
  );
}

export function WorkflowPriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG[WORKFLOW_PRIORITY.MEDIUM];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '0.7rem',
        fontWeight: 700,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`
      }}
    >
      {priority || 'Medium'}
    </span>
  );
}

// ── Main Workflow Manager Component ──────────────────────────────────────────
export default function WorkflowManager({ isAdmin, userRole, user }) {
  // State
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState('kanban'); // 'overview' | 'kanban' | 'list' | 'timeline' | 'approvals'
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterAssignee, setFilterAssignee] = useState('ALL');

  // Modals & Drawers
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [transitionPrompt, setTransitionPrompt] = useState(null); // { task, toStatus, reason: '', reviewNotes: '' }
  const [actionNotice, setActionNotice] = useState({ message: '', type: 'info' });

  // Pagination for List View
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const normalizedRole = (userRole || (isAdmin ? ROLES.ADMIN : ROLES.RESIDENT)).toUpperCase();
  const canManage = [ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER, ROLES.MANAGER].includes(normalizedRole);
  const isApprover = APPROVER_ROLES.includes(normalizedRole);

  const showNotification = (message, type = 'info') => {
    setActionNotice({ message, type });
    setTimeout(() => setActionNotice({ message: '', type: 'info' }), 4000);
  };

  // Initial Load
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [prjs, tsks] = await Promise.all([
        loadWorkflowProjects(),
        loadWorkflowTasks()
      ]);
      setProjects(prjs);
      setTasks(tsks);
    } catch (err) {
      console.error('Failed to load workflow data:', err);
      showNotification('Error loading workflow data.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Derived Metrics
  const metrics = useMemo(() => {
    return calculateWorkflowMetrics(projects, tasks);
  }, [projects, tasks]);

  // Unique Assignees for filter
  const assigneesList = useMemo(() => {
    const set = new Set();
    tasks.forEach(t => { if (t.assignedTo) set.add(t.assignedTo); });
    return Array.from(set);
  }, [tasks]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (selectedProjectId !== 'ALL' && t.projectId !== selectedProjectId) return false;
      if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false;
      if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
      if (filterAssignee !== 'ALL' && t.assignedTo !== filterAssignee) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = (t.title || '').toLowerCase().includes(q) ||
          (t.taskCategory || '').toLowerCase().includes(q) ||
          (t.area || '').toLowerCase().includes(q) ||
          (t.assignedTo || '').toLowerCase().includes(q) ||
          (t.vendorName || '').toLowerCase().includes(q) ||
          (t.id || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [tasks, selectedProjectId, filterPriority, filterStatus, filterAssignee, searchQuery]);

  // Tasks Awaiting Review / Approval
  const pendingApprovals = useMemo(() => {
    return tasks.filter(t => t.status === WORKFLOW_STATUS.IN_REVIEW);
  }, [tasks]);

  // Handle Status Transition Attempt
  const initiateTransition = (task, toStatus) => {
    // Check if transition requires modal prompt
    if (toStatus === WORKFLOW_STATUS.BLOCKED) {
      setTransitionPrompt({
        task,
        toStatus,
        field: 'blockerReason',
        label: 'Blocker Reason (Minimum 5 characters)',
        placeholder: 'Describe what is impeding this task (e.g. vendor delay, missing material)...',
        value: task.blockerReason || ''
      });
      return;
    }

    if (task.status === WORKFLOW_STATUS.BLOCKED && toStatus !== WORKFLOW_STATUS.CANCELLED) {
      setTransitionPrompt({
        task,
        toStatus,
        field: 'resolutionNotes',
        label: 'Unblock Resolution Notes (Minimum 5 characters)',
        placeholder: 'Describe how the blocker was resolved...',
        value: ''
      });
      return;
    }

    if (toStatus === WORKFLOW_STATUS.REJECTED) {
      setTransitionPrompt({
        task,
        toStatus,
        field: 'rejectionReason',
        label: 'Rejection Feedback & Rework Required (Minimum 5 characters)',
        placeholder: 'State what quality criteria failed or what needs rework...',
        value: ''
      });
      return;
    }

    if (toStatus === WORKFLOW_STATUS.APPROVED) {
      setTransitionPrompt({
        task,
        toStatus,
        field: 'reviewNotes',
        label: 'Approval Notes / Verification Remarks',
        placeholder: 'Optional approval notes or signoff confirmation...',
        value: `Verified and approved by ${normalizedRole} on ${new Date().toLocaleDateString('en-GB')}`
      });
      return;
    }

    // Direct transition for simple steps
    executeTransition(task, toStatus, {});
  };

  const executeTransition = async (task, toStatus, context = {}) => {
    try {
      const validation = validateStatusTransition(task, toStatus, normalizedRole, context, tasks);
      if (!validation.allowed) {
        showNotification(validation.reason, 'error');
        return;
      }

      const updatedTask = {
        ...task,
        status: toStatus,
        blockerReason: toStatus === WORKFLOW_STATUS.BLOCKED ? (context.blockerReason || task.blockerReason) : (toStatus === WORKFLOW_STATUS.IN_PROGRESS ? '' : task.blockerReason),
        reviewNotes: context.reviewNotes || task.reviewNotes,
        rejectionReason: context.rejectionReason || task.rejectionReason
      };

      await saveWorkflowTask(updatedTask, user, normalizedRole, context);
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
      if (selectedTask?.id === updatedTask.id) {
        setSelectedTask(updatedTask);
      }
      setTransitionPrompt(null);
      showNotification(`Task "${task.title || task.taskCategory}" moved to ${toStatus}.`, 'success');
    } catch (err) {
      console.error('Transition error:', err);
      showNotification(err.message || 'Transition failed.', 'error');
    }
  };

  // Toggle Quality Checklist Item
  const handleToggleQualityItem = async (task, index) => {
    if (!canManage) return;
    const checklist = [...(task.qualityChecklist || [])];
    checklist[index] = { ...checklist[index], passed: !checklist[index].passed };
    const updated = { ...task, qualityChecklist: checklist };
    try {
      await saveWorkflowTask(updated, user, normalizedRole);
      setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
      if (selectedTask?.id === task.id) setSelectedTask(updated);
      showNotification('Quality inspection checklist updated.', 'success');
    } catch (err) {
      showNotification('Failed to update checklist.', 'error');
    }
  };

  // Save Task Form
  const handleSaveTaskForm = async (formData) => {
    try {
      const saved = await saveWorkflowTask(formData, user, normalizedRole);
      setTasks(prev => {
        const idx = prev.findIndex(t => t.id === saved.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [saved, ...prev];
      });
      setIsTaskModalOpen(false);
      setEditingTask(null);
      showNotification(`Task "${saved.title}" saved successfully.`, 'success');
    } catch (err) {
      showNotification(err.message || 'Error saving task.', 'error');
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task permanently?')) return;
    try {
      await deleteWorkflowTask(taskId, user, normalizedRole);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      if (selectedTask?.id === taskId) setSelectedTask(null);
      showNotification('Task deleted successfully.', 'success');
    } catch (err) {
      showNotification('Failed to delete task.', 'error');
    }
  };

  // Save Project Form
  const handleSaveProjectForm = async (projectData) => {
    try {
      const saved = await saveWorkflowProject(projectData, user, normalizedRole);
      setProjects(prev => {
        const idx = prev.findIndex(p => p.id === saved.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [saved, ...prev];
      });
      setIsProjectModalOpen(false);
      setEditingProject(null);
      showNotification(`Project "${saved.title}" saved successfully.`, 'success');
    } catch (err) {
      showNotification(err.message || 'Error saving project.', 'error');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = 'Task ID,Project,Title,Category,Area,Assigned To,Priority,Status,Deadline,Days Left,Cost,Blockers\n';
    const rows = filteredTasks.map(t => {
      const days = calcDaysLeft(t.deadline, t.status);
      const prj = projects.find(p => p.id === t.projectId)?.title || t.projectId;
      return `"${t.id}","${(prj || '').replace(/"/g, '""')}","${(t.title || '').replace(/"/g, '""')}","${(t.taskCategory || '').replace(/"/g, '""')}","${(t.area || '').replace(/"/g, '""')}","${(t.assignedTo || '').replace(/"/g, '""')}","${t.priority}","${t.status}","${t.deadline || ''}","${days !== null ? days : ''}","${t.actualCost || t.estimatedCost || 0}","${(t.blockerReason || '').replace(/"/g, '""')}"`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Majestique_Euriska_Workflow_Tasks_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Kanban Columns Definition (Organized by lifecycle phases)
  const KANBAN_LANES = [
    {
      id: 'LANE_PLANNED',
      title: 'Planning & Backlog',
      statuses: [WORKFLOW_STATUS.DRAFT, WORKFLOW_STATUS.PLANNED],
      accentColor: '#3b82f6',
      badge: 'Backlog'
    },
    {
      id: 'LANE_READY',
      title: 'Ready for Kickoff',
      statuses: [WORKFLOW_STATUS.READY],
      accentColor: '#0d9488',
      badge: 'Ready'
    },
    {
      id: 'LANE_IN_PROGRESS',
      title: 'Active Execution',
      statuses: [WORKFLOW_STATUS.IN_PROGRESS],
      accentColor: '#f59e0b',
      badge: 'In Progress'
    },
    {
      id: 'LANE_BLOCKED',
      title: 'Blocked / Needs Action',
      statuses: [WORKFLOW_STATUS.BLOCKED],
      accentColor: '#ef4444',
      badge: 'Blocked'
    },
    {
      id: 'LANE_REVIEW',
      title: 'Inspection & Review',
      statuses: [WORKFLOW_STATUS.IN_REVIEW, WORKFLOW_STATUS.REJECTED],
      accentColor: '#8b5cf6',
      badge: 'Under Review'
    },
    {
      id: 'LANE_DONE',
      title: 'Approved & Completed',
      statuses: [WORKFLOW_STATUS.APPROVED, WORKFLOW_STATUS.COMPLETED],
      accentColor: '#10b981',
      badge: 'Completed'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* ── Top Header Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(248,250,252,0.85) 100%)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(226,232,240,0.8)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #0d9488, #059669)',
              color: '#ffffff',
              padding: '8px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(13,148,136,0.25)'
            }}>
              <Briefcase size={22} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
              Society Project & Workflow Engine
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
            End-to-end lifecycle from initiation, milestone breakdown, blocker resolution to Committee approvals & signoff.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={refreshData}
            title="Refresh Data"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              fontSize: '0.84rem',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={15} /> Refresh
          </button>

          <button
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              fontSize: '0.84rem',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <Download size={15} /> Export CSV
          </button>

          <button
            onClick={() => setActiveView('presentation')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: activeView === 'presentation' ? '#0d9488' : '#ffffff',
              border: '1.5px solid #0d9488',
              borderRadius: '10px',
              fontSize: '0.84rem',
              fontWeight: 700,
              color: activeView === 'presentation' ? '#ffffff' : '#0d9488',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(13,148,136,0.15)'
            }}
          >
            <Presentation size={15} /> View PPT In-Portal
          </button>

          {canManage && (
            <>
              <button
                onClick={() => { setEditingProject(null); setIsProjectModalOpen(true); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: '#f8fafc',
                  border: '1px solid #0d9488',
                  borderRadius: '10px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  color: '#0d9488',
                  cursor: 'pointer'
                }}
              >
                <Plus size={15} /> New Project
              </button>

              <button
                onClick={() => { setEditingTask(null); setIsTaskModalOpen(true); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #0d9488, #059669)',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(13,148,136,0.3)'
                }}
              >
                <Plus size={15} /> Create Task
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Action Notice Toast ── */}
      {actionNotice.message && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '10px',
          fontSize: '0.86rem',
          fontWeight: 600,
          background: actionNotice.type === 'error' ? '#fee2e2' : actionNotice.type === 'success' ? '#dcfce7' : '#e0f2fe',
          color: actionNotice.type === 'error' ? '#991b1b' : actionNotice.type === 'success' ? '#15803d' : '#0369a1',
          border: `1px solid ${actionNotice.type === 'error' ? '#fca5a5' : actionNotice.type === 'success' ? '#86efac' : '#7dd3fc'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          animation: 'fadeIn 0.2s ease-in'
        }}>
          <span>{actionNotice.message}</span>
          <button
            onClick={() => setActionNotice({ message: '', type: 'info' })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── KPI Metric Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.85)',
          padding: '16px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Active Projects</span>
            <Layers size={16} color="#0d9488" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
            {metrics.activeProjects} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#94a3b8' }}>/ {metrics.totalProjects}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#0d9488', fontWeight: 600, marginTop: '4px' }}>
            {metrics.completedProjects} Completed
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.85)',
          padding: '16px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Execution Progress</span>
            <TrendingUp size={16} color="#059669" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#059669', marginTop: '6px' }}>
            {metrics.completionRate}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            {metrics.completedTasks} of {metrics.totalTasks} Tasks closed
          </div>
        </div>

        <div style={{
          background: metrics.blockedTasks > 0 ? '#fff1f2' : 'rgba(255,255,255,0.85)',
          padding: '16px',
          borderRadius: '14px',
          border: `1px solid ${metrics.blockedTasks > 0 ? '#fecdd3' : '#e2e8f0'}`,
          boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: metrics.blockedTasks > 0 ? '#be123c' : '#64748b', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Blocked Tasks</span>
            <AlertOctagon size={16} color="#e11d48" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: metrics.blockedTasks > 0 ? '#be123c' : '#0f172a', marginTop: '6px' }}>
            {metrics.blockedTasks}
          </div>
          <div style={{ fontSize: '0.75rem', color: metrics.blockedTasks > 0 ? '#be123c' : '#64748b', fontWeight: 600, marginTop: '4px' }}>
            Impediments requiring action
          </div>
        </div>

        <div style={{
          background: pendingApprovals.length > 0 ? '#faf5ff' : 'rgba(255,255,255,0.85)',
          padding: '16px',
          borderRadius: '14px',
          border: `1px solid ${pendingApprovals.length > 0 ? '#e9d5ff' : '#e2e8f0'}`,
          boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7e22ce', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Pending Review</span>
            <Eye size={16} color="#7e22ce" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#7e22ce', marginTop: '6px' }}>
            {pendingApprovals.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#7e22ce', fontWeight: 600, marginTop: '4px' }}>
            Committee approval gates
          </div>
        </div>

        <div style={{
          background: metrics.overdueTasks > 0 ? '#fff7ed' : 'rgba(255,255,255,0.85)',
          padding: '16px',
          borderRadius: '14px',
          border: `1px solid ${metrics.overdueTasks > 0 ? '#fed7aa' : '#e2e8f0'}`,
          boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: metrics.overdueTasks > 0 ? '#c2410c' : '#64748b', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Overdue Tasks</span>
            <AlertTriangle size={16} color="#ea580c" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: metrics.overdueTasks > 0 ? '#c2410c' : '#0f172a', marginTop: '6px' }}>
            {metrics.overdueTasks}
          </div>
          <div style={{ fontSize: '0.75rem', color: metrics.overdueTasks > 0 ? '#c2410c' : '#64748b', fontWeight: 600, marginTop: '4px' }}>
            Past deadline target
          </div>
        </div>
      </div>

      {/* ── View Switcher & Filter Toolbar ── */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '14px 18px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '14px'
      }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
          {[
            { id: 'kanban', label: 'Kanban Board', icon: <Layers size={15} /> },
            { id: 'list', label: 'List & Table', icon: <FileText size={15} /> },
            { id: 'overview', label: 'Projects Overview', icon: <Briefcase size={15} /> },
            { id: 'approvals', label: `Approval Desk (${pendingApprovals.length})`, icon: <Award size={15} /> },
            { id: 'presentation', label: '📽️ PPT Deck', icon: <Presentation size={15} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: activeView === tab.id ? 700 : 500,
                border: 'none',
                background: activeView === tab.id ? '#ffffff' : 'transparent',
                color: activeView === tab.id ? '#0f172a' : '#64748b',
                boxShadow: activeView === tab.id ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search tasks, categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '6px 10px 6px 30px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                outline: 'none',
                width: '180px'
              }}
            />
          </div>

          {/* Project Select */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              color: '#334155',
              background: '#ffffff'
            }}
          >
            <option value="ALL">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>

          {/* Priority Select */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              color: '#334155',
              background: '#ffffff'
            }}
          >
            <option value="ALL">All Priorities</option>
            {Object.values(WORKFLOW_PRIORITY).map(pr => (
              <option key={pr} value={pr}>{pr}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── View 1: Kanban Board ── */}
      {activeView === 'kanban' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
          alignItems: 'start'
        }}>
          {KANBAN_LANES.map(lane => {
            const laneTasks = filteredTasks.filter(t => lane.statuses.includes(t.status));
            return (
              <div
                key={lane.id}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  minHeight: '400px'
                }}
              >
                {/* Lane Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '8px',
                  borderBottom: `2px solid ${lane.accentColor}`
                }}>
                  <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1e293b' }}>
                    {lane.title}
                  </span>
                  <span style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: '#e2e8f0',
                    color: '#475569'
                  }}>
                    {laneTasks.length}
                  </span>
                </div>

                {/* Task Cards in Lane */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {laneTasks.length === 0 ? (
                    <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                      No tasks in this lane
                    </div>
                  ) : (
                    laneTasks.map(task => {
                      const daysLeft = calcDaysLeft(task.deadline, task.status);
                      const isOverdue = daysLeft !== null && daysLeft < 0;
                      const projectName = projects.find(p => p.id === task.projectId)?.title;

                      return (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          style={{
                            background: '#ffffff',
                            borderRadius: '12px',
                            border: task.status === WORKFLOW_STATUS.BLOCKED ? '1.5px solid #fca5a5' : '1px solid #e2e8f0',
                            padding: '14px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            transition: 'transform 0.1s ease, box-shadow 0.1s ease'
                          }}
                        >
                          {/* Project Tag & Priority */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>
                              {projectName ? projectName.slice(0, 22) + (projectName.length > 22 ? '…' : '') : task.projectId}
                            </span>
                            <WorkflowPriorityBadge priority={task.priority} />
                          </div>

                          {/* Task Title */}
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                            {task.title || task.taskCategory}
                          </div>

                          {/* Area & Vendor */}
                          <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {task.area && <span>📍 {task.area}</span>}
                            {task.vendorName && <span>🏢 {task.vendorName}</span>}
                          </div>

                          {/* Blocker Alert Warning */}
                          {task.status === WORKFLOW_STATUS.BLOCKED && task.blockerReason && (
                            <div style={{
                              background: '#fff1f2',
                              border: '1px solid #fecdd3',
                              borderRadius: '6px',
                              padding: '6px 8px',
                              fontSize: '0.72rem',
                              color: '#991b1b',
                              fontWeight: 600
                            }}>
                              ⚠ Blocker: {task.blockerReason}
                            </div>
                          )}

                          {/* Review notes if in review */}
                          {task.status === WORKFLOW_STATUS.IN_REVIEW && task.reviewNotes && (
                            <div style={{
                              background: '#faf5ff',
                              border: '1px solid #e9d5ff',
                              borderRadius: '6px',
                              padding: '6px 8px',
                              fontSize: '0.72rem',
                              color: '#7e22ce'
                            }}>
                              📋 Inspection requested: {task.reviewNotes}
                            </div>
                          )}

                          {/* Card Footer: Assignee & Days left */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '4px',
                            paddingTop: '6px',
                            borderTop: '1px solid #f1f5f9',
                            fontSize: '0.74rem'
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569', fontWeight: 500 }}>
                              <User size={12} /> {task.assignedTo || 'Unassigned'}
                            </span>

                            {daysLeft !== null && (
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                background: isOverdue ? '#fee2e2' : daysLeft <= 3 ? '#fef3c7' : '#dcfce7',
                                color: isOverdue ? '#991b1b' : daysLeft <= 3 ? '#92400e' : '#15803d'
                              }}>
                                {isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                              </span>
                            )}
                          </div>

                          {/* Quick Workflow Transitions */}
                          {canManage && (
                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                              {(VALID_TRANSITIONS[task.status] || []).map(nextStatus => {
                                const isApprovalAction = [WORKFLOW_STATUS.APPROVED, WORKFLOW_STATUS.REJECTED].includes(nextStatus);
                                if (isApprovalAction && !isApprover) return null;

                                return (
                                  <button
                                    key={nextStatus}
                                    onClick={() => initiateTransition(task, nextStatus)}
                                    style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 600,
                                      padding: '3px 7px',
                                      borderRadius: '6px',
                                      border: '1px solid #cbd5e1',
                                      background: nextStatus === WORKFLOW_STATUS.APPROVED ? '#dcfce7' : nextStatus === WORKFLOW_STATUS.REJECTED ? '#fee2e2' : '#f8fafc',
                                      color: nextStatus === WORKFLOW_STATUS.APPROVED ? '#15803d' : nextStatus === WORKFLOW_STATUS.REJECTED ? '#991b1b' : '#334155',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    → {nextStatus}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── View 2: List & Table View ── */}
      {activeView === 'list' && (
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '12px 14px' }}>Task ID</th>
                  <th style={{ padding: '12px 14px' }}>Title & Scope</th>
                  <th style={{ padding: '12px 14px' }}>Project</th>
                  <th style={{ padding: '12px 14px' }}>Area</th>
                  <th style={{ padding: '12px 14px' }}>Assigned</th>
                  <th style={{ padding: '12px 14px' }}>Priority</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px' }}>Deadline</th>
                  <th style={{ padding: '12px 14px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                      No tasks matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(task => {
                    const daysLeft = calcDaysLeft(task.deadline, task.status);
                    const isOverdue = daysLeft !== null && daysLeft < 0;
                    const prj = projects.find(p => p.id === task.projectId);

                    return (
                      <tr
                        key={task.id}
                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                        onClick={() => setSelectedTask(task)}
                      >
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>{task.id}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{task.title || task.taskCategory}</div>
                          {task.scopeDescription && (
                            <div style={{ fontSize: '0.74rem', color: '#64748b', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {task.scopeDescription}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#475569' }}>{prj?.title || task.projectId}</td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>{task.area || '—'}</td>
                        <td style={{ padding: '10px 14px', color: '#334155', fontWeight: 600 }}>{task.assignedTo || '—'}</td>
                        <td style={{ padding: '10px 14px' }}><WorkflowPriorityBadge priority={task.priority} /></td>
                        <td style={{ padding: '10px 14px' }}><WorkflowStatusBadge status={task.status} /></td>
                        <td style={{ padding: '10px 14px' }}>
                          <div>{formatDate(task.deadline)}</div>
                          {daysLeft !== null && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isOverdue ? '#991b1b' : '#047857' }}>
                              {isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => setSelectedTask(task)}
                              style={{ background: '#f1f5f9', border: 'none', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer' }}
                              title="View Details"
                            >
                              <Eye size={14} color="#334155" />
                            </button>
                            {canManage && (
                              <button
                                onClick={() => { setEditingTask(task); setIsTaskModalOpen(true); }}
                                style={{ background: '#f1f5f9', border: 'none', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer' }}
                                title="Edit Task"
                              >
                                <Edit3 size={14} color="#0d9488" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Showing {Math.min(filteredTasks.length, (currentPage - 1) * pageSize + 1)} - {Math.min(filteredTasks.length, currentPage * pageSize)} of {filteredTasks.length} tasks
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.78rem', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', opacity: currentPage <= 1 ? 0.5 : 1 }}
              >
                Previous
              </button>
              <button
                disabled={currentPage * pageSize >= filteredTasks.length}
                onClick={() => setCurrentPage(p => p + 1)}
                style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.78rem', cursor: currentPage * pageSize >= filteredTasks.length ? 'not-allowed' : 'pointer', opacity: currentPage * pageSize >= filteredTasks.length ? 0.5 : 1 }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View 3: Projects Overview ── */}
      {activeView === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
          {projects.map(prj => {
            const prjTasks = tasks.filter(t => t.projectId === prj.id);
            const completedCount = prjTasks.filter(t => t.status === WORKFLOW_STATUS.COMPLETED).length;
            const progressPct = prjTasks.length > 0 ? Math.round((completedCount / prjTasks.length) * 100) : 0;
            const blockedInPrj = prjTasks.filter(t => t.status === WORKFLOW_STATUS.BLOCKED).length;

            return (
              <div
                key={prj.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  padding: '20px',
                  boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {prj.code || prj.id}
                    </span>
                    <h3 style={{ margin: '4px 0 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                      {prj.title}
                    </h3>
                  </div>
                  <WorkflowStatusBadge status={prj.status} />
                </div>

                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4 }}>
                  {prj.description}
                </p>

                {/* Scope points */}
                {prj.scope && prj.scope.length > 0 && (
                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', fontSize: '0.76rem', color: '#334155' }}>
                    <div style={{ fontWeight: 700, marginBottom: '4px', color: '#475569' }}>Key Scope & Deliverables:</div>
                    <ul style={{ margin: 0, paddingLeft: '16px' }}>
                      {prj.scope.slice(0, 3).map((s, idx) => (
                        <li key={idx} style={{ marginBottom: '2px' }}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Progress Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    <span>Project Completion</span>
                    <span>{progressPct}% ({completedCount}/{prjTasks.length} tasks)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, #0d9488, #059669)', transition: 'width 0.3s ease' }} />
                  </div>
                </div>

                {/* Milestones Checklist */}
                {prj.milestones && prj.milestones.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Milestone Target Dates:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {prj.milestones.map(m => (
                        <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', padding: '4px 8px', background: m.completed ? '#ecfdf5' : '#ffffff', border: '1px solid #f1f5f9', borderRadius: '6px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: m.completed ? '#047857' : '#334155' }}>
                            {m.completed ? <Check size={12} color="#059669" /> : <Clock size={12} color="#94a3b8" />}
                            {m.title}
                          </span>
                          <span style={{ color: '#64748b' }}>{formatDate(m.targetDate)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer details */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 'auto',
                  paddingTop: '10px',
                  borderTop: '1px solid #f1f5f9',
                  fontSize: '0.76rem'
                }}>
                  <span style={{ color: '#64748b' }}>
                    Lead: <strong style={{ color: '#0f172a' }}>{prj.owner}</strong>
                  </span>
                  {prj.budget > 0 && (
                    <span style={{ fontWeight: 700, color: '#0d9488' }}>
                      {formatCurrency(prj.budget)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── View 4: Approval Desk ── */}
      {activeView === 'approvals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            background: '#faf5ff',
            border: '1px solid #e9d5ff',
            borderRadius: '14px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Award size={28} color="#7e22ce" />
            <div>
              <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#581c87' }}>
                Executive Committee Review & Quality Gate
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#6b21a8' }}>
                Tasks submitted by the Estate Manager and engineering contractors awaiting verification, inspection signoff, or rework guidance.
              </p>
            </div>
          </div>

          {pendingApprovals.length === 0 ? (
            <div style={{
              background: '#ffffff',
              padding: '48px',
              textAlign: 'center',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              color: '#64748b'
            }}>
              <CheckCircle2 size={36} color="#059669" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>All Review Queues Clear</div>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '4px 0 0' }}>No tasks currently pending Committee inspection or approval.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {pendingApprovals.map(task => {
                const prj = projects.find(p => p.id === task.projectId);
                return (
                  <div
                    key={task.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '14px',
                      border: '1.5px solid #d8b4fe',
                      padding: '18px',
                      boxShadow: '0 4px 14px rgba(126,34,206,0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7e22ce' }}>{task.id} • {prj?.title}</span>
                      <WorkflowPriorityBadge priority={task.priority} />
                    </div>

                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                      {task.title || task.taskCategory}
                    </h4>

                    {task.scopeDescription && (
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>
                        {task.scopeDescription}
                      </p>
                    )}

                    {task.reviewNotes && (
                      <div style={{ background: '#fdf4ff', border: '1px solid #f0abfc', borderRadius: '8px', padding: '8px 10px', fontSize: '0.78rem', color: '#86198f' }}>
                        <strong>Submission Notes:</strong> {task.reviewNotes}
                      </div>
                    )}

                    {/* Quality checklist summary */}
                    {task.qualityChecklist && task.qualityChecklist.length > 0 && (
                      <div style={{ fontSize: '0.76rem', color: '#475569' }}>
                        <strong>Quality Inspection Items:</strong>
                        <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {task.qualityChecklist.map((q, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                type="checkbox"
                                checked={q.passed}
                                disabled={!canManage}
                                onChange={() => handleToggleQualityItem(task, idx)}
                              />
                              <span style={{ textDecoration: q.passed ? 'line-through' : 'none', color: q.passed ? '#059669' : '#334155' }}>
                                {q.item}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                      {isApprover ? (
                        <>
                          <button
                            onClick={() => initiateTransition(task, WORKFLOW_STATUS.APPROVED)}
                            style={{
                              flex: 1,
                              padding: '8px',
                              borderRadius: '8px',
                              border: 'none',
                              background: '#059669',
                              color: '#fff',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <Check size={14} /> Approve Work
                          </button>
                          <button
                            onClick={() => initiateTransition(task, WORKFLOW_STATUS.REJECTED)}
                            style={{
                              flex: 1,
                              padding: '8px',
                              borderRadius: '8px',
                              border: '1px solid #fecdd3',
                              background: '#fff1f2',
                              color: '#be123c',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <X size={14} /> Request Rework
                          </button>
                        </>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          Requires Society Approver role (Chairman/Secretary/Treasurer)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── View 5: In-Portal PPT Presentation ── */}
      {activeView === 'presentation' && (
        <InPortalDocumentViewer initialDocId="workflow_ppt" />
      )}

      {/* ── Task Detail Drawer / Modal ── */}
      {selectedTask && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
          onClick={() => setSelectedTask(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              height: '100%',
              background: '#ffffff',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              padding: '24px'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0d9488' }}>
                  {selectedTask.id} • {selectedTask.area || 'General Area'}
                </span>
                <h3 style={{ margin: '4px 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  {selectedTask.title || selectedTask.taskCategory}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Status & Priority Row */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', margin: '16px 0' }}>
              <WorkflowStatusBadge status={selectedTask.status} />
              <WorkflowPriorityBadge priority={selectedTask.priority} />
              {selectedTask.deadline && (
                <span style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} /> Due: {formatDate(selectedTask.deadline)}
                </span>
              )}
            </div>

            {/* Scope / Description */}
            <div style={{ marginBottom: '16px' }}>
              <h5 style={{ margin: '0 0 6px', fontSize: '0.78rem', textTransform: 'uppercase', color: '#475569', letterSpacing: '0.04em' }}>
                Scope & Requirements
              </h5>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#334155', lineHeight: 1.5, background: '#f8fafc', padding: '12px', borderRadius: '10px' }}>
                {selectedTask.scopeDescription || selectedTask.taskDescription || 'No detailed scope provided.'}
              </p>
            </div>

            {/* Blocker reason if blocked */}
            {selectedTask.status === WORKFLOW_STATUS.BLOCKED && selectedTask.blockerReason && (
              <div style={{ marginBottom: '16px', background: '#fff1f2', border: '1px solid #fecdd3', padding: '12px', borderRadius: '10px' }}>
                <h5 style={{ margin: '0 0 4px', fontSize: '0.78rem', color: '#991b1b', textTransform: 'uppercase' }}>
                  ⚠ Active Blocker
                </h5>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#991b1b', fontWeight: 600 }}>
                  {selectedTask.blockerReason}
                </p>
              </div>
            )}

            {/* Quality Checklist */}
            {selectedTask.qualityChecklist && selectedTask.qualityChecklist.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h5 style={{ margin: '0 0 6px', fontSize: '0.78rem', textTransform: 'uppercase', color: '#475569' }}>
                  Quality Acceptance Checklist
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedTask.qualityChecklist.map((item, idx) => (
                    <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#1e293b', cursor: canManage ? 'pointer' : 'default' }}>
                      <input
                        type="checkbox"
                        checked={item.passed}
                        disabled={!canManage}
                        onChange={() => handleToggleQualityItem(selectedTask, idx)}
                      />
                      <span style={{ textDecoration: item.passed ? 'line-through' : 'none', color: item.passed ? '#059669' : '#1e293b' }}>
                        {item.item}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Assignment & Costs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '10px', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: '#64748b' }}>Assigned To:</span>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedTask.assignedTo || 'Unassigned'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Vendor / Contractor:</span>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedTask.vendorName || 'Internal'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Estimated Budget:</span>
                <div style={{ fontWeight: 700, color: '#0d9488' }}>{formatCurrency(selectedTask.estimatedCost)}</div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Actual Spend:</span>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{formatCurrency(selectedTask.actualCost)}</div>
              </div>
            </div>

            {/* Activity History Audit Trail */}
            {selectedTask.activityLog && selectedTask.activityLog.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h5 style={{ margin: '0 0 8px', fontSize: '0.78rem', textTransform: 'uppercase', color: '#475569' }}>
                  Audit History & Transitions
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.76rem' }}>
                  {selectedTask.activityLog.map((log, idx) => (
                    <div key={idx} style={{ padding: '8px', background: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid #0d9488' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                        <strong style={{ color: '#0f172a' }}>{log.action}</strong>
                        <span>{formatDate(log.timestamp)}</span>
                      </div>
                      <div style={{ color: '#475569', marginTop: '2px' }}>
                        By: {log.user} {log.notes && `— "${log.notes}"`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transition Controls Footer */}
            {canManage && (
              <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                  Advance Workflow Status:
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {(VALID_TRANSITIONS[selectedTask.status] || []).map(nextStatus => {
                    const isApproval = [WORKFLOW_STATUS.APPROVED, WORKFLOW_STATUS.REJECTED].includes(nextStatus);
                    if (isApproval && !isApprover) return null;

                    return (
                      <button
                        key={nextStatus}
                        onClick={() => initiateTransition(selectedTask, nextStatus)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          border: '1px solid #cbd5e1',
                          background: nextStatus === WORKFLOW_STATUS.APPROVED ? '#dcfce7' : nextStatus === WORKFLOW_STATUS.REJECTED ? '#fee2e2' : '#f8fafc',
                          color: nextStatus === WORKFLOW_STATUS.APPROVED ? '#15803d' : nextStatus === WORKFLOW_STATUS.REJECTED ? '#991b1b' : '#1e293b',
                          cursor: 'pointer'
                        }}
                      >
                        → Move to {nextStatus}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Transition Prompt Modal (for Blocker, Review Notes, Rejection) ── */}
      {transitionPrompt && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setTransitionPrompt(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h4 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Confirm Transition to {transitionPrompt.toStatus}
            </h4>
            <p style={{ margin: '0 0 16px', fontSize: '0.84rem', color: '#64748b' }}>
              {transitionPrompt.label}
            </p>

            <textarea
              rows={4}
              value={transitionPrompt.value}
              onChange={e => setTransitionPrompt(p => ({ ...p, value: e.target.value }))}
              placeholder={transitionPrompt.placeholder}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.86rem',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
              <button
                onClick={() => setTransitionPrompt(null)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.84rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => executeTransition(transitionPrompt.task, transitionPrompt.toStatus, { [transitionPrompt.field]: transitionPrompt.value })}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: transitionPrompt.toStatus === WORKFLOW_STATUS.REJECTED ? '#be123c' : '#0d9488',
                  color: '#fff',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Confirm {transitionPrompt.toStatus}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Task Modal ── */}
      {isTaskModalOpen && (
        <TaskFormModal
          task={editingTask}
          projects={projects}
          onSave={handleSaveTaskForm}
          onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }}
        />
      )}

      {/* ── Create / Edit Project Modal ── */}
      {isProjectModalOpen && (
        <ProjectFormModal
          project={editingProject}
          onSave={handleSaveProjectForm}
          onClose={() => { setIsProjectModalOpen(false); setEditingProject(null); }}
        />
      )}
    </div>
  );
}

// ── Sub-component: Task Form Modal ───────────────────────────────────────────
function TaskFormModal({ task, projects, onSave, onClose }) {
  const [form, setForm] = useState({
    id: task?.id || '',
    projectId: task?.projectId || (projects[0]?.id || 'PRJ-COMMON-OPS'),
    title: task?.title || '',
    taskCategory: task?.taskCategory || '',
    area: task?.area || 'Common Area',
    assignedTo: task?.assignedTo || 'Siddu',
    vendorName: task?.vendorName || '',
    priority: task?.priority || WORKFLOW_PRIORITY.MEDIUM,
    status: task?.status || WORKFLOW_STATUS.PLANNED,
    deadline: task?.deadline || '',
    estimatedCost: task?.estimatedCost || 0,
    scopeDescription: task?.scopeDescription || task?.taskDescription || '',
    qualityChecklist: task?.qualityChecklist || [
      { item: 'Physical inspection completed', passed: false },
      { item: 'Vendor warranty or service report attached', passed: false }
    ]
  });

  const handleChange = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title && !form.taskCategory) {
      alert('Task title is required');
      return;
    }
    onSave(form);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(15,23,42,0.6)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 80px rgba(0,0,0,0.2)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
            {task ? 'Edit Workflow Task' : 'Create New Workflow Task'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Project Initiative</label>
            <select
              value={form.projectId}
              onChange={e => handleChange('projectId', e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Task Title / Deliverable</label>
            <input
              type="text"
              required
              placeholder="e.g. Roof Solar Wiring Inspection"
              value={form.title}
              onChange={e => handleChange('title', e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Area / Location</label>
              <input
                type="text"
                placeholder="e.g. Wing A Terrace"
                value={form.area}
                onChange={e => handleChange('area', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Assignee</label>
              <input
                type="text"
                placeholder="e.g. Siddu / Amit"
                value={form.assignedTo}
                onChange={e => handleChange('assignedTo', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Priority</label>
              <select
                value={form.priority}
                onChange={e => handleChange('priority', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                {Object.values(WORKFLOW_PRIORITY).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Status</label>
              <select
                value={form.status}
                onChange={e => handleChange('status', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                {Object.values(WORKFLOW_STATUS).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Target Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={e => handleChange('deadline', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Scope & Technical Requirements</label>
            <textarea
              rows={3}
              placeholder="Describe deliverables, material requirements, or vendor instructions..."
              value={form.scopeDescription}
              onChange={e => handleChange('scopeDescription', e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#0d9488', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
            >
              Save Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Sub-component: Project Form Modal ────────────────────────────────────────
function ProjectFormModal({ project, onSave, onClose }) {
  const [form, setForm] = useState({
    id: project?.id || '',
    code: project?.code || '',
    title: project?.title || '',
    category: project?.category || 'Infrastructure',
    area: project?.area || 'Campus Wide',
    owner: project?.owner || 'Amit (Secretary)',
    targetDate: project?.targetDate || '',
    budget: project?.budget || 0,
    status: project?.status || WORKFLOW_STATUS.IN_PROGRESS,
    description: project?.description || ''
  });

  const handleChange = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title) {
      alert('Project title is required');
      return;
    }
    onSave(form);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(15,23,42,0.6)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 25px 80px rgba(0,0,0,0.2)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
            {project ? 'Edit Project Initiative' : 'Create New Society Project'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Project Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Elevator Modernization & AMC"
              value={form.title}
              onChange={e => handleChange('title', e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Category</label>
              <input
                type="text"
                placeholder="e.g. Safety / Energy / Civil"
                value={form.category}
                onChange={e => handleChange('category', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Project Lead / Owner</label>
              <input
                type="text"
                placeholder="e.g. Amit (Secretary)"
                value={form.owner}
                onChange={e => handleChange('owner', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Approved Budget (₹)</label>
              <input
                type="number"
                value={form.budget}
                onChange={e => handleChange('budget', parseFloat(e.target.value) || 0)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Target Completion</label>
              <input
                type="date"
                value={form.targetDate}
                onChange={e => handleChange('targetDate', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Strategic Goals & Description</label>
            <textarea
              rows={3}
              placeholder="State the expected outcome, society benefits, and milestones..."
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#0d9488', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
            >
              Save Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
