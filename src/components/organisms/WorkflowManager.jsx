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
import './WorkflowManager.css';


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
      className="workflow-manager-s1" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
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
      className="workflow-manager-s2" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
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
    <div className="workflow-manager-s3">
      {/* ── Top Header Banner ── */}
      <div className="workflow-manager-s4">
        <div>
          <div className="workflow-manager-s5">
            <div className="workflow-manager-s6">
              <Briefcase size={22} />
            </div>
            <h2 className="workflow-manager-s7">
              Society Project & Workflow Engine
            </h2>
          </div>
          <p className="workflow-manager-s8">
            End-to-end lifecycle from initiation, milestone breakdown, blocker resolution to Committee approvals & signoff.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="workflow-manager-s9">
          <button
            onClick={refreshData}
            title="Refresh Data"
            className="workflow-manager-s10"
          >
            <RefreshCw size={15} /> Refresh
          </button>

          <button
            onClick={handleExportCSV}
            className="workflow-manager-s10"
          >
            <Download size={15} /> Export CSV
          </button>

          <button
            onClick={() => setActiveView('presentation')}
            className={`workflow-manager-s11 ${(activeView === 'presentation' ? 'workflow-manager-cond-1-true' : 'workflow-manager-cond-2-false')}`}
          >
            <Presentation size={15} /> View PPT In-Portal
          </button>

          {canManage && (
            <>
              <button
                onClick={() => { setEditingProject(null); setIsProjectModalOpen(true); }}
                className="workflow-manager-s12"
              >
                <Plus size={15} /> New Project
              </button>

              <button
                onClick={() => { setEditingTask(null); setIsTaskModalOpen(true); }}
                className="workflow-manager-s13"
              >
                <Plus size={15} /> Create Task
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Action Notice Toast ── */}
      {actionNotice.message && (
        <div className="workflow-manager-s14" style={{ background: actionNotice.type === 'error' ? '#fee2e2' : actionNotice.type === 'success' ? '#dcfce7' : '#e0f2fe', color: actionNotice.type === 'error' ? '#991b1b' : actionNotice.type === 'success' ? '#15803d' : '#0369a1', border: `1px solid ${actionNotice.type === 'error' ? '#fca5a5' : actionNotice.type === 'success' ? '#86efac' : '#7dd3fc'}` }}>
          <span>{actionNotice.message}</span>
          <button
            onClick={() => setActionNotice({ message: '', type: 'info' })}
            className="workflow-manager-s15"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── KPI Metric Cards ── */}
      <div className="workflow-manager-s16">
        <div className="workflow-manager-s17">
          <div className="workflow-manager-s18">
            <span>Active Projects</span>
            <Layers size={16} color="#0d9488" />
          </div>
          <div className="workflow-manager-s19">
            {metrics.activeProjects} <span className="workflow-manager-s20">/ {metrics.totalProjects}</span>
          </div>
          <div className="workflow-manager-s21">
            {metrics.completedProjects} Completed
          </div>
        </div>

        <div className="workflow-manager-s17">
          <div className="workflow-manager-s18">
            <span>Execution Progress</span>
            <TrendingUp size={16} color="#059669" />
          </div>
          <div className="workflow-manager-s22">
            {metrics.completionRate}%
          </div>
          <div className="workflow-manager-s23">
            {metrics.completedTasks} of {metrics.totalTasks} Tasks closed
          </div>
        </div>

        <div className={`workflow-manager-s24 ${(metrics.blockedTasks > 0 ? 'workflow-manager-cond-3-true' : 'workflow-manager-cond-4-false')}`} style={{ border: `1px solid ${metrics.blockedTasks > 0 ? '#fecdd3' : '#e2e8f0'}` }}>
          <div className={`workflow-manager-s25 ${(metrics.blockedTasks > 0 ? 'workflow-manager-cond-5-true' : 'workflow-manager-cond-6-false')}`}>
            <span>Blocked Tasks</span>
            <AlertOctagon size={16} color="#e11d48" />
          </div>
          <div className={`workflow-manager-s26 ${(metrics.blockedTasks > 0 ? 'workflow-manager-cond-7-true' : 'workflow-manager-cond-8-false')}`}>
            {metrics.blockedTasks}
          </div>
          <div className={`workflow-manager-s27 ${(metrics.blockedTasks > 0 ? 'workflow-manager-cond-9-true' : 'workflow-manager-cond-10-false')}`}>
            Impediments requiring action
          </div>
        </div>

        <div className={`workflow-manager-s24 ${(pendingApprovals.length > 0 ? 'workflow-manager-cond-11-true' : 'workflow-manager-cond-12-false')}`} style={{ border: `1px solid ${pendingApprovals.length > 0 ? '#e9d5ff' : '#e2e8f0'}` }}>
          <div className="workflow-manager-s28">
            <span>Pending Review</span>
            <Eye size={16} color="#7e22ce" />
          </div>
          <div className="workflow-manager-s29">
            {pendingApprovals.length}
          </div>
          <div className="workflow-manager-s30">
            Committee approval gates
          </div>
        </div>

        <div className={`workflow-manager-s24 ${(metrics.overdueTasks > 0 ? 'workflow-manager-cond-13-true' : 'workflow-manager-cond-14-false')}`} style={{ border: `1px solid ${metrics.overdueTasks > 0 ? '#fed7aa' : '#e2e8f0'}` }}>
          <div className={`workflow-manager-s25 ${(metrics.overdueTasks > 0 ? 'workflow-manager-cond-15-true' : 'workflow-manager-cond-16-false')}`}>
            <span>Overdue Tasks</span>
            <AlertTriangle size={16} color="#ea580c" />
          </div>
          <div className={`workflow-manager-s26 ${(metrics.overdueTasks > 0 ? 'workflow-manager-cond-17-true' : 'workflow-manager-cond-18-false')}`}>
            {metrics.overdueTasks}
          </div>
          <div className={`workflow-manager-s27 ${(metrics.overdueTasks > 0 ? 'workflow-manager-cond-19-true' : 'workflow-manager-cond-20-false')}`}>
            Past deadline target
          </div>
        </div>
      </div>

      {/* ── View Switcher & Filter Toolbar ── */}
      <div className="workflow-manager-s31">
        {/* Navigation Tabs */}
        <div className="workflow-manager-s32">
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
              className={`workflow-manager-s33 ${(activeView === tab.id ? 'workflow-manager-cond-21-true' : 'workflow-manager-cond-22-false')}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="workflow-manager-s34">
          {/* Search Input */}
          <div className="workflow-manager-s35">
            <Search size={14} className="workflow-manager-s36" />
            <input
              type="text"
              placeholder="Search tasks, categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="workflow-manager-s37"
            />
          </div>

          {/* Project Select */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="workflow-manager-s38"
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
            className="workflow-manager-s38"
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
        <div className="workflow-manager-s39">
          {KANBAN_LANES.map(lane => {
            const laneTasks = filteredTasks.filter(t => lane.statuses.includes(t.status));
            return (
              <div
                key={lane.id}
                className="workflow-manager-s40"
              >
                {/* Lane Header */}
                <div className="workflow-manager-s41" style={{ borderBottom: `2px solid ${lane.accentColor}` }}>
                  <span className="workflow-manager-s42">
                    {lane.title}
                  </span>
                  <span className="workflow-manager-s43">
                    {laneTasks.length}
                  </span>
                </div>

                {/* Task Cards in Lane */}
                <div className="workflow-manager-s44">
                  {laneTasks.length === 0 ? (
                    <div className="workflow-manager-s45">
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
                          className={`workflow-manager-s46 ${(task.status === WORKFLOW_STATUS.BLOCKED ? 'workflow-manager-cond-23-true' : 'workflow-manager-cond-24-false')}`}
                        >
                          {/* Project Tag & Priority */}
                          <div className="workflow-manager-s47">
                            <span className="workflow-manager-s48">
                              {projectName ? projectName.slice(0, 22) + (projectName.length > 22 ? '…' : '') : task.projectId}
                            </span>
                            <WorkflowPriorityBadge priority={task.priority} />
                          </div>

                          {/* Task Title */}
                          <div className="workflow-manager-s49">
                            {task.title || task.taskCategory}
                          </div>

                          {/* Area & Vendor */}
                          <div className="workflow-manager-s50">
                            {task.area && <span>📍 {task.area}</span>}
                            {task.vendorName && <span>🏢 {task.vendorName}</span>}
                          </div>

                          {/* Blocker Alert Warning */}
                          {task.status === WORKFLOW_STATUS.BLOCKED && task.blockerReason && (
                            <div className="workflow-manager-s51">
                              ⚠ Blocker: {task.blockerReason}
                            </div>
                          )}

                          {/* Review notes if in review */}
                          {task.status === WORKFLOW_STATUS.IN_REVIEW && task.reviewNotes && (
                            <div className="workflow-manager-s52">
                              📋 Inspection requested: {task.reviewNotes}
                            </div>
                          )}

                          {/* Card Footer: Assignee & Days left */}
                          <div className="workflow-manager-s53">
                            <span className="workflow-manager-s54">
                              <User size={12} /> {task.assignedTo || 'Unassigned'}
                            </span>

                            {daysLeft !== null && (
                              <span className="workflow-manager-s55" style={{ background: isOverdue ? '#fee2e2' : daysLeft <= 3 ? '#fef3c7' : '#dcfce7', color: isOverdue ? '#991b1b' : daysLeft <= 3 ? '#92400e' : '#15803d' }}>
                                {isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                              </span>
                            )}
                          </div>

                          {/* Quick Workflow Transitions */}
                          {canManage && (
                            <div className="workflow-manager-s56" onClick={e => e.stopPropagation()}>
                              {(VALID_TRANSITIONS[task.status] || []).map(nextStatus => {
                                const isApprovalAction = [WORKFLOW_STATUS.APPROVED, WORKFLOW_STATUS.REJECTED].includes(nextStatus);
                                if (isApprovalAction && !isApprover) return null;

                                return (
                                  <button
                                    key={nextStatus}
                                    onClick={() => initiateTransition(task, nextStatus)}
                                    className="workflow-manager-s57" style={{ background: nextStatus === WORKFLOW_STATUS.APPROVED ? '#dcfce7' : nextStatus === WORKFLOW_STATUS.REJECTED ? '#fee2e2' : '#f8fafc', color: nextStatus === WORKFLOW_STATUS.APPROVED ? '#15803d' : nextStatus === WORKFLOW_STATUS.REJECTED ? '#991b1b' : '#334155' }}
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
        <div className="workflow-manager-s58">
          <div className="workflow-manager-s59">
            <table className="workflow-manager-s60">
              <thead>
                <tr className="workflow-manager-s61">
                  <th className="workflow-manager-s62">Task ID</th>
                  <th className="workflow-manager-s62">Title & Scope</th>
                  <th className="workflow-manager-s62">Project</th>
                  <th className="workflow-manager-s62">Area</th>
                  <th className="workflow-manager-s62">Assigned</th>
                  <th className="workflow-manager-s62">Priority</th>
                  <th className="workflow-manager-s62">Status</th>
                  <th className="workflow-manager-s62">Deadline</th>
                  <th className="workflow-manager-s62">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="workflow-manager-s63">
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
                        className="workflow-manager-s64"
                        onClick={() => setSelectedTask(task)}
                      >
                        <td className="workflow-manager-s65">{task.id}</td>
                        <td className="workflow-manager-s66">
                          <div className="workflow-manager-s67">{task.title || task.taskCategory}</div>
                          {task.scopeDescription && (
                            <div className="workflow-manager-s68">
                              {task.scopeDescription}
                            </div>
                          )}
                        </td>
                        <td className="workflow-manager-s69">{prj?.title || task.projectId}</td>
                        <td className="workflow-manager-s70">{task.area || '—'}</td>
                        <td className="workflow-manager-s71">{task.assignedTo || '—'}</td>
                        <td className="workflow-manager-s66"><WorkflowPriorityBadge priority={task.priority} /></td>
                        <td className="workflow-manager-s66"><WorkflowStatusBadge status={task.status} /></td>
                        <td className="workflow-manager-s66">
                          <div>{formatDate(task.deadline)}</div>
                          {daysLeft !== null && (
                            <span className={`workflow-manager-s72 ${(isOverdue ? 'workflow-manager-cond-25-true' : 'workflow-manager-cond-26-false')}`}>
                              {isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                            </span>
                          )}
                        </td>
                        <td className="workflow-manager-s66" onClick={e => e.stopPropagation()}>
                          <div className="workflow-manager-s73">
                            <button
                              onClick={() => setSelectedTask(task)}
                              className="workflow-manager-s74"
                              title="View Details"
                            >
                              <Eye size={14} color="#334155" />
                            </button>
                            {canManage && (
                              <button
                                onClick={() => { setEditingTask(task); setIsTaskModalOpen(true); }}
                                className="workflow-manager-s74"
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
          <div className="workflow-manager-s75">
            <span className="workflow-manager-s76">
              Showing {Math.min(filteredTasks.length, (currentPage - 1) * pageSize + 1)} - {Math.min(filteredTasks.length, currentPage * pageSize)} of {filteredTasks.length} tasks
            </span>
            <div className="workflow-manager-s73">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className={`workflow-manager-s77 ${(currentPage <= 1 ? 'workflow-manager-cond-27-true' : 'workflow-manager-cond-28-false')}`}
              >
                Previous
              </button>
              <button
                disabled={currentPage * pageSize >= filteredTasks.length}
                onClick={() => setCurrentPage(p => p + 1)}
                className={`workflow-manager-s77 ${(currentPage * pageSize >= filteredTasks.length ? 'workflow-manager-cond-29-true' : 'workflow-manager-cond-30-false')}`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View 3: Projects Overview ── */}
      {activeView === 'overview' && (
        <div className="workflow-manager-s78">
          {projects.map(prj => {
            const prjTasks = tasks.filter(t => t.projectId === prj.id);
            const completedCount = prjTasks.filter(t => t.status === WORKFLOW_STATUS.COMPLETED).length;
            const progressPct = prjTasks.length > 0 ? Math.round((completedCount / prjTasks.length) * 100) : 0;
            const blockedInPrj = prjTasks.filter(t => t.status === WORKFLOW_STATUS.BLOCKED).length;

            return (
              <div
                key={prj.id}
                className="workflow-manager-s79"
              >
                <div className="workflow-manager-s80">
                  <div>
                    <span className="workflow-manager-s81">
                      {prj.code || prj.id}
                    </span>
                    <h3 className="workflow-manager-s82">
                      {prj.title}
                    </h3>
                  </div>
                  <WorkflowStatusBadge status={prj.status} />
                </div>

                <p className="workflow-manager-s83">
                  {prj.description}
                </p>

                {/* Scope points */}
                {prj.scope && prj.scope.length > 0 && (
                  <div className="workflow-manager-s84">
                    <div className="workflow-manager-s85">Key Scope & Deliverables:</div>
                    <ul className="workflow-manager-s86">
                      {prj.scope.slice(0, 3).map((s, idx) => (
                        <li key={idx} className="workflow-manager-s87">{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Progress Bar */}
                <div>
                  <div className="workflow-manager-s88">
                    <span>Project Completion</span>
                    <span>{progressPct}% ({completedCount}/{prjTasks.length} tasks)</span>
                  </div>
                  <div className="workflow-manager-s89">
                    <div className="workflow-manager-s90" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>

                {/* Milestones Checklist */}
                {prj.milestones && prj.milestones.length > 0 && (
                  <div>
                    <div className="workflow-manager-s91">Milestone Target Dates:</div>
                    <div className="workflow-manager-s92">
                      {prj.milestones.map(m => (
                        <div key={m.id} className={`workflow-manager-s93 ${(m.completed ? 'workflow-manager-cond-31-true' : 'workflow-manager-cond-32-false')}`}>
                          <span className={`workflow-manager-s94 ${(m.completed ? 'workflow-manager-cond-33-true' : 'workflow-manager-cond-34-false')}`}>
                            {m.completed ? <Check size={12} color="#059669" /> : <Clock size={12} color="#94a3b8" />}
                            {m.title}
                          </span>
                          <span className="workflow-manager-s95">{formatDate(m.targetDate)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer details */}
                <div className="workflow-manager-s96">
                  <span className="workflow-manager-s95">
                    Lead: <strong className="workflow-manager-s97">{prj.owner}</strong>
                  </span>
                  {prj.budget > 0 && (
                    <span className="workflow-manager-s98">
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
        <div className="workflow-manager-s99">
          <div className="workflow-manager-s100">
            <Award size={28} color="#7e22ce" />
            <div>
              <h4 className="workflow-manager-s101">
                Executive Committee Review & Quality Gate
              </h4>
              <p className="workflow-manager-s102">
                Tasks submitted by the Estate Manager and engineering contractors awaiting verification, inspection signoff, or rework guidance.
              </p>
            </div>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="workflow-manager-s103">
              <CheckCircle2 size={36} color="#059669" className="workflow-manager-s104" />
              <div className="workflow-manager-s105">All Review Queues Clear</div>
              <p className="workflow-manager-s106">No tasks currently pending Committee inspection or approval.</p>
            </div>
          ) : (
            <div className="workflow-manager-s107">
              {pendingApprovals.map(task => {
                const prj = projects.find(p => p.id === task.projectId);
                return (
                  <div
                    key={task.id}
                    className="workflow-manager-s108"
                  >
                    <div className="workflow-manager-s47">
                      <span className="workflow-manager-s109">{task.id} • {prj?.title}</span>
                      <WorkflowPriorityBadge priority={task.priority} />
                    </div>

                    <h4 className="workflow-manager-s110">
                      {task.title || task.taskCategory}
                    </h4>

                    {task.scopeDescription && (
                      <p className="workflow-manager-s111">
                        {task.scopeDescription}
                      </p>
                    )}

                    {task.reviewNotes && (
                      <div className="workflow-manager-s112">
                        <strong>Submission Notes:</strong> {task.reviewNotes}
                      </div>
                    )}

                    {/* Quality checklist summary */}
                    {task.qualityChecklist && task.qualityChecklist.length > 0 && (
                      <div className="workflow-manager-s113">
                        <strong>Quality Inspection Items:</strong>
                        <div className="workflow-manager-s114">
                          {task.qualityChecklist.map((q, idx) => (
                            <div key={idx} className="workflow-manager-s94">
                              <input
                                type="checkbox"
                                checked={q.passed}
                                disabled={!canManage}
                                onChange={() => handleToggleQualityItem(task, idx)}
                              />
                              <span className={`${(q.passed ? 'workflow-manager-cond-35-true' : 'workflow-manager-cond-36-false')}`}>
                                {q.item}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="workflow-manager-s115">
                      {isApprover ? (
                        <>
                          <button
                            onClick={() => initiateTransition(task, WORKFLOW_STATUS.APPROVED)}
                            className="workflow-manager-s116"
                          >
                            <Check size={14} /> Approve Work
                          </button>
                          <button
                            onClick={() => initiateTransition(task, WORKFLOW_STATUS.REJECTED)}
                            className="workflow-manager-s117"
                          >
                            <X size={14} /> Request Rework
                          </button>
                        </>
                      ) : (
                        <div className="workflow-manager-s118">
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
          className="workflow-manager-s119"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="workflow-manager-s120"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="workflow-manager-s121">
              <div>
                <span className="workflow-manager-s122">
                  {selectedTask.id} • {selectedTask.area || 'General Area'}
                </span>
                <h3 className="workflow-manager-s123">
                  {selectedTask.title || selectedTask.taskCategory}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="workflow-manager-s124"
              >
                <X size={20} />
              </button>
            </div>

            {/* Status & Priority Row */}
            <div className="workflow-manager-s125">
              <WorkflowStatusBadge status={selectedTask.status} />
              <WorkflowPriorityBadge priority={selectedTask.priority} />
              {selectedTask.deadline && (
                <span className="workflow-manager-s126">
                  <Calendar size={13} /> Due: {formatDate(selectedTask.deadline)}
                </span>
              )}
            </div>

            {/* Scope / Description */}
            <div className="workflow-manager-s127">
              <h5 className="workflow-manager-s128">
                Scope & Requirements
              </h5>
              <p className="workflow-manager-s129">
                {selectedTask.scopeDescription || selectedTask.taskDescription || 'No detailed scope provided.'}
              </p>
            </div>

            {/* Blocker reason if blocked */}
            {selectedTask.status === WORKFLOW_STATUS.BLOCKED && selectedTask.blockerReason && (
              <div className="workflow-manager-s130">
                <h5 className="workflow-manager-s131">
                  ⚠ Active Blocker
                </h5>
                <p className="workflow-manager-s132">
                  {selectedTask.blockerReason}
                </p>
              </div>
            )}

            {/* Quality Checklist */}
            {selectedTask.qualityChecklist && selectedTask.qualityChecklist.length > 0 && (
              <div className="workflow-manager-s127">
                <h5 className="workflow-manager-s133">
                  Quality Acceptance Checklist
                </h5>
                <div className="workflow-manager-s134">
                  {selectedTask.qualityChecklist.map((item, idx) => (
                    <label key={idx} className={`workflow-manager-s135 ${(canManage ? 'workflow-manager-cond-37-true' : 'workflow-manager-cond-38-false')}`}>
                      <input
                        type="checkbox"
                        checked={item.passed}
                        disabled={!canManage}
                        onChange={() => handleToggleQualityItem(selectedTask, idx)}
                      />
                      <span className={`${(item.passed ? 'workflow-manager-cond-39-true' : 'workflow-manager-cond-40-false')}`}>
                        {item.item}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Assignment & Costs */}
            <div className="workflow-manager-s136">
              <div>
                <span className="workflow-manager-s95">Assigned To:</span>
                <div className="workflow-manager-s67">{selectedTask.assignedTo || 'Unassigned'}</div>
              </div>
              <div>
                <span className="workflow-manager-s95">Vendor / Contractor:</span>
                <div className="workflow-manager-s67">{selectedTask.vendorName || 'Internal'}</div>
              </div>
              <div>
                <span className="workflow-manager-s95">Estimated Budget:</span>
                <div className="workflow-manager-s98">{formatCurrency(selectedTask.estimatedCost)}</div>
              </div>
              <div>
                <span className="workflow-manager-s95">Actual Spend:</span>
                <div className="workflow-manager-s67">{formatCurrency(selectedTask.actualCost)}</div>
              </div>
            </div>

            {/* Activity History Audit Trail */}
            {selectedTask.activityLog && selectedTask.activityLog.length > 0 && (
              <div className="workflow-manager-s127">
                <h5 className="workflow-manager-s137">
                  Audit History & Transitions
                </h5>
                <div className="workflow-manager-s138">
                  {selectedTask.activityLog.map((log, idx) => (
                    <div key={idx} className="workflow-manager-s139">
                      <div className="workflow-manager-s140">
                        <strong className="workflow-manager-s97">{log.action}</strong>
                        <span>{formatDate(log.timestamp)}</span>
                      </div>
                      <div className="workflow-manager-s141">
                        By: {log.user} {log.notes && `— "${log.notes}"`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transition Controls Footer */}
            {canManage && (
              <div className="workflow-manager-s142">
                <div className="workflow-manager-s143">
                  Advance Workflow Status:
                </div>
                <div className="workflow-manager-s144">
                  {(VALID_TRANSITIONS[selectedTask.status] || []).map(nextStatus => {
                    const isApproval = [WORKFLOW_STATUS.APPROVED, WORKFLOW_STATUS.REJECTED].includes(nextStatus);
                    if (isApproval && !isApprover) return null;

                    return (
                      <button
                        key={nextStatus}
                        onClick={() => initiateTransition(selectedTask, nextStatus)}
                        className="workflow-manager-s145" style={{ background: nextStatus === WORKFLOW_STATUS.APPROVED ? '#dcfce7' : nextStatus === WORKFLOW_STATUS.REJECTED ? '#fee2e2' : '#f8fafc', color: nextStatus === WORKFLOW_STATUS.APPROVED ? '#15803d' : nextStatus === WORKFLOW_STATUS.REJECTED ? '#991b1b' : '#1e293b' }}
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
          className="workflow-manager-s146"
          onClick={() => setTransitionPrompt(null)}
        >
          <div
            className="workflow-manager-s147"
            onClick={e => e.stopPropagation()}
          >
            <h4 className="workflow-manager-s148">
              Confirm Transition to {transitionPrompt.toStatus}
            </h4>
            <p className="workflow-manager-s149">
              {transitionPrompt.label}
            </p>

            <textarea
              rows={4}
              value={transitionPrompt.value}
              onChange={e => setTransitionPrompt(p => ({ ...p, value: e.target.value }))}
              placeholder={transitionPrompt.placeholder}
              className="workflow-manager-s150"
            />

            <div className="workflow-manager-s151">
              <button
                onClick={() => setTransitionPrompt(null)}
                className="workflow-manager-s152"
              >
                Cancel
              </button>
              <button
                onClick={() => executeTransition(transitionPrompt.task, transitionPrompt.toStatus, { [transitionPrompt.field]: transitionPrompt.value })}
                className={`workflow-manager-s153 ${(transitionPrompt.toStatus === WORKFLOW_STATUS.REJECTED ? 'workflow-manager-cond-41-true' : 'workflow-manager-cond-42-false')}`}
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
      className="workflow-manager-s154"
      onClick={onClose}
    >
      <div
        className="workflow-manager-s155"
        onClick={e => e.stopPropagation()}
      >
        <div className="workflow-manager-s156">
          <h3 className="workflow-manager-s157">
            {task ? 'Edit Workflow Task' : 'Create New Workflow Task'}
          </h3>
          <button onClick={onClose} className="workflow-manager-s124">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="workflow-manager-s158">
          <div>
            <label className="workflow-manager-s159">Project Initiative</label>
            <select
              value={form.projectId}
              onChange={e => handleChange('projectId', e.target.value)}
              className="workflow-manager-s160"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="workflow-manager-s159">Task Title / Deliverable</label>
            <input
              type="text"
              required
              placeholder="e.g. Roof Solar Wiring Inspection"
              value={form.title}
              onChange={e => handleChange('title', e.target.value)}
              className="workflow-manager-s161"
            />
          </div>

          <div className="workflow-manager-s162">
            <div>
              <label className="workflow-manager-s159">Area / Location</label>
              <input
                type="text"
                placeholder="e.g. Wing A Terrace"
                value={form.area}
                onChange={e => handleChange('area', e.target.value)}
                className="workflow-manager-s161"
              />
            </div>
            <div>
              <label className="workflow-manager-s159">Assignee</label>
              <input
                type="text"
                placeholder="e.g. Siddu / Amit"
                value={form.assignedTo}
                onChange={e => handleChange('assignedTo', e.target.value)}
                className="workflow-manager-s161"
              />
            </div>
          </div>

          <div className="workflow-manager-s163">
            <div>
              <label className="workflow-manager-s159">Priority</label>
              <select
                value={form.priority}
                onChange={e => handleChange('priority', e.target.value)}
                className="workflow-manager-s160"
              >
                {Object.values(WORKFLOW_PRIORITY).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="workflow-manager-s159">Status</label>
              <select
                value={form.status}
                onChange={e => handleChange('status', e.target.value)}
                className="workflow-manager-s160"
              >
                {Object.values(WORKFLOW_STATUS).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="workflow-manager-s159">Target Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={e => handleChange('deadline', e.target.value)}
                className="workflow-manager-s161"
              />
            </div>
          </div>

          <div>
            <label className="workflow-manager-s159">Scope & Technical Requirements</label>
            <textarea
              rows={3}
              placeholder="Describe deliverables, material requirements, or vendor instructions..."
              value={form.scopeDescription}
              onChange={e => handleChange('scopeDescription', e.target.value)}
              className="workflow-manager-s164"
            />
          </div>

          <div className="workflow-manager-s165">
            <button
              type="button"
              onClick={onClose}
              className="workflow-manager-s166"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="workflow-manager-s167"
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
      className="workflow-manager-s154"
      onClick={onClose}
    >
      <div
        className="workflow-manager-s168"
        onClick={e => e.stopPropagation()}
      >
        <div className="workflow-manager-s156">
          <h3 className="workflow-manager-s157">
            {project ? 'Edit Project Initiative' : 'Create New Society Project'}
          </h3>
          <button onClick={onClose} className="workflow-manager-s124">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="workflow-manager-s158">
          <div>
            <label className="workflow-manager-s159">Project Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Elevator Modernization & AMC"
              value={form.title}
              onChange={e => handleChange('title', e.target.value)}
              className="workflow-manager-s161"
            />
          </div>

          <div className="workflow-manager-s162">
            <div>
              <label className="workflow-manager-s159">Category</label>
              <input
                type="text"
                placeholder="e.g. Safety / Energy / Civil"
                value={form.category}
                onChange={e => handleChange('category', e.target.value)}
                className="workflow-manager-s161"
              />
            </div>
            <div>
              <label className="workflow-manager-s159">Project Lead / Owner</label>
              <input
                type="text"
                placeholder="e.g. Amit (Secretary)"
                value={form.owner}
                onChange={e => handleChange('owner', e.target.value)}
                className="workflow-manager-s161"
              />
            </div>
          </div>

          <div className="workflow-manager-s162">
            <div>
              <label className="workflow-manager-s159">Approved Budget (₹)</label>
              <input
                type="number"
                value={form.budget}
                onChange={e => handleChange('budget', parseFloat(e.target.value) || 0)}
                className="workflow-manager-s161"
              />
            </div>
            <div>
              <label className="workflow-manager-s159">Target Completion</label>
              <input
                type="date"
                value={form.targetDate}
                onChange={e => handleChange('targetDate', e.target.value)}
                className="workflow-manager-s161"
              />
            </div>
          </div>

          <div>
            <label className="workflow-manager-s159">Strategic Goals & Description</label>
            <textarea
              rows={3}
              placeholder="State the expected outcome, society benefits, and milestones..."
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              className="workflow-manager-s164"
            />
          </div>

          <div className="workflow-manager-s165">
            <button
              type="button"
              onClick={onClose}
              className="workflow-manager-s166"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="workflow-manager-s167"
            >
              Save Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
