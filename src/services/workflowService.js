/**
 * Majestique Euriska Society Management Portal
 * Central Workflow & Project Lifecycle Engine
 *
 * Implements end-to-end workflow management:
 * 1. Project Initiation & Scope
 * 2. 10-State Formal Workflow Status Transition State Machine
 * 3. Role-Based Approval Gates & Guards
 * 4. Milestones, Dependencies, Blocker & Risk Tracking
 * 5. Quality Inspection & Acceptance Signoff
 * 6. Audit Logging & Notification Triggers
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../firebase.js';
import { ROLES } from './rbacService.js';
import { logAuditEvent, AUDIT_ACTIONS } from './auditService.js';

// ── 1. Formal Workflow Statuses (10 Core States) ──────────────────────────────
export const WORKFLOW_STATUS = {
  DRAFT: 'Draft',
  PLANNED: 'Planned',
  READY: 'Ready',
  IN_PROGRESS: 'In Progress',
  BLOCKED: 'Blocked',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

// ── 2. Priority & Severity ───────────────────────────────────────────────────
export const WORKFLOW_PRIORITY = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low'
};

export const WORKFLOW_SEVERITY = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low'
};

// ── 3. Visual Badges & Styling Tokens ─────────────────────────────────────────
export const STATUS_CONFIG = {
  [WORKFLOW_STATUS.DRAFT]: {
    label: 'Draft',
    bg: '#f1f5f9',
    color: '#475569',
    border: '#cbd5e1',
    description: 'Initial proposal, scope formulation'
  },
  [WORKFLOW_STATUS.PLANNED]: {
    label: 'Planned',
    bg: '#eff6ff',
    color: '#1d4ed8',
    border: '#bfdbfe',
    description: 'Requirements gathered, budgeted & scheduled'
  },
  [WORKFLOW_STATUS.READY]: {
    label: 'Ready',
    bg: '#f0fdfa',
    color: '#0f766e',
    border: '#99f6e4',
    description: 'Prerequisites met, vendor/team assigned'
  },
  [WORKFLOW_STATUS.IN_PROGRESS]: {
    label: 'In Progress',
    bg: '#fef3c7',
    color: '#b45309',
    border: '#fde68a',
    description: 'Actively underway by assigned owner'
  },
  [WORKFLOW_STATUS.BLOCKED]: {
    label: 'Blocked',
    bg: '#fee2e2',
    color: '#b91c1c',
    border: '#fca5a5',
    description: 'Impeded by vendor, parts, or dependency'
  },
  [WORKFLOW_STATUS.IN_REVIEW]: {
    label: 'In Review',
    bg: '#f3e8ff',
    color: '#7e22ce',
    border: '#d8b4fe',
    description: 'Submitted for Committee inspection & review'
  },
  [WORKFLOW_STATUS.APPROVED]: {
    label: 'Approved',
    bg: '#e0f2fe',
    color: '#0369a1',
    border: '#bae6fd',
    description: 'Approved by Committee/Approver'
  },
  [WORKFLOW_STATUS.REJECTED]: {
    label: 'Rejected',
    bg: '#ffe4e6',
    color: '#be123c',
    border: '#fecdd3',
    description: 'Review rejected with feedback for rework'
  },
  [WORKFLOW_STATUS.COMPLETED]: {
    label: 'Completed',
    bg: '#dcfce7',
    color: '#15803d',
    border: '#86efac',
    description: 'Quality signoff done, deliverables accepted'
  },
  [WORKFLOW_STATUS.CANCELLED]: {
    label: 'Cancelled',
    bg: '#f3f4f6',
    color: '#6b7280',
    border: '#d1d5db',
    description: 'De-scoped, superseded or cancelled'
  }
};

export const PRIORITY_CONFIG = {
  [WORKFLOW_PRIORITY.CRITICAL]: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  [WORKFLOW_PRIORITY.HIGH]:     { bg: '#ffedd5', color: '#c2410c', border: '#fdba74' },
  [WORKFLOW_PRIORITY.MEDIUM]:   { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  [WORKFLOW_PRIORITY.LOW]:      { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
};

// ── 4. Workflow Transition State Machine ──────────────────────────────────────
export const VALID_TRANSITIONS = {
  [WORKFLOW_STATUS.DRAFT]:       [WORKFLOW_STATUS.PLANNED, WORKFLOW_STATUS.CANCELLED],
  [WORKFLOW_STATUS.PLANNED]:     [WORKFLOW_STATUS.READY, WORKFLOW_STATUS.DRAFT, WORKFLOW_STATUS.CANCELLED],
  [WORKFLOW_STATUS.READY]:       [WORKFLOW_STATUS.IN_PROGRESS, WORKFLOW_STATUS.BLOCKED, WORKFLOW_STATUS.PLANNED, WORKFLOW_STATUS.CANCELLED],
  [WORKFLOW_STATUS.IN_PROGRESS]: [WORKFLOW_STATUS.IN_REVIEW, WORKFLOW_STATUS.BLOCKED, WORKFLOW_STATUS.READY, WORKFLOW_STATUS.CANCELLED],
  [WORKFLOW_STATUS.BLOCKED]:     [WORKFLOW_STATUS.IN_PROGRESS, WORKFLOW_STATUS.READY, WORKFLOW_STATUS.CANCELLED],
  [WORKFLOW_STATUS.IN_REVIEW]:   [WORKFLOW_STATUS.APPROVED, WORKFLOW_STATUS.REJECTED, WORKFLOW_STATUS.IN_PROGRESS],
  [WORKFLOW_STATUS.APPROVED]:    [WORKFLOW_STATUS.COMPLETED, WORKFLOW_STATUS.IN_PROGRESS],
  [WORKFLOW_STATUS.REJECTED]:    [WORKFLOW_STATUS.IN_PROGRESS, WORKFLOW_STATUS.DRAFT, WORKFLOW_STATUS.CANCELLED],
  [WORKFLOW_STATUS.COMPLETED]:   [WORKFLOW_STATUS.IN_PROGRESS], // Reopen if punchlist fails
  [WORKFLOW_STATUS.CANCELLED]:   [WORKFLOW_STATUS.DRAFT]        // Reopen into draft
};

// Roles authorized to approve/reject review gates
export const APPROVER_ROLES = [ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER];

// Roles authorized to initiate / manage projects
export const PROJECT_MANAGER_ROLES = [ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER, ROLES.MANAGER];

/**
 * Validates whether a status transition is permitted according to state machine,
 * user role permissions, required transition fields, and dependencies.
 *
 * @param {object} task - Current task object
 * @param {string} toStatus - Target workflow status
 * @param {string} userRole - Current user's normalized role
 * @param {object} [context={}] - Transition payload (blockerReason, reviewNotes, etc.)
 * @param {Array} [allTasks=[]] - All tasks in project (for dependency verification)
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function validateStatusTransition(task, toStatus, userRole, context = {}, allTasks = []) {
  if (!task || !toStatus) {
    return { allowed: false, reason: 'Task and target status are required.' };
  }

  const normalizedRole = (userRole || '').toUpperCase();
  const fromStatus = task.status || WORKFLOW_STATUS.DRAFT;

  // 1. Same status is a no-op
  if (fromStatus === toStatus) {
    return { allowed: true };
  }

  // 2. Validate state machine transition graph
  const allowedNext = VALID_TRANSITIONS[fromStatus] || [];
  if (!allowedNext.includes(toStatus)) {
    return {
      allowed: false,
      reason: `Invalid transition from "${fromStatus}" to "${toStatus}". Allowed next states: ${allowedNext.join(', ') || 'None'}.`
    };
  }

  // 3. Role authorization checks
  // 3a. Read-only residents cannot change workflow status
  if (normalizedRole === ROLES.RESIDENT) {
    return {
      allowed: false,
      reason: 'Residents have read-only access to society workflows and cannot change task status.'
    };
  }

  // 3b. Reviewer Gate: Only Approver roles can Approve or Reject
  if ([WORKFLOW_STATUS.APPROVED, WORKFLOW_STATUS.REJECTED].includes(toStatus)) {
    if (!APPROVER_ROLES.includes(normalizedRole)) {
      return {
        allowed: false,
        reason: `Only Society Approvers (${APPROVER_ROLES.join(', ')}) can approve or reject tasks.`
      };
    }
  }

  // 3c. Reopening completed/cancelled tasks requires Admin/Chairman/Secretary
  if ([WORKFLOW_STATUS.COMPLETED, WORKFLOW_STATUS.CANCELLED].includes(fromStatus)) {
    if (![ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY].includes(normalizedRole)) {
      return {
        allowed: false,
        reason: 'Only Admin or Executive Committee (Chairman/Secretary) can reopen closed tasks.'
      };
    }
  }

  // 4. Required Field Validations
  // 4a. Moving to BLOCKED requires a blocker reason
  if (toStatus === WORKFLOW_STATUS.BLOCKED) {
    const reason = context.blockerReason || task.blockerReason;
    if (!reason || reason.trim().length < 5) {
      return {
        allowed: false,
        reason: 'A specific Blocker Reason (minimum 5 characters) is required when marking a task as Blocked.'
      };
    }
  }

  // 4b. Moving out of BLOCKED requires a resolution note
  if (fromStatus === WORKFLOW_STATUS.BLOCKED && toStatus !== WORKFLOW_STATUS.CANCELLED) {
    const resolution = context.resolutionNotes || context.remarks;
    if (!resolution || resolution.trim().length < 5) {
      return {
        allowed: false,
        reason: 'Resolution notes (minimum 5 characters) are required to unblock this task.'
      };
    }
  }

  // 4c. Moving to REJECTED requires feedback for rework
  if (toStatus === WORKFLOW_STATUS.REJECTED) {
    const feedback = context.rejectionReason || context.reviewNotes;
    if (!feedback || feedback.trim().length < 5) {
      return {
        allowed: false,
        reason: 'Detailed rejection feedback is required when rejecting work.'
      };
    }
  }

  // 4d. Moving to IN_PROGRESS requires checking dependencies
  if (toStatus === WORKFLOW_STATUS.IN_PROGRESS && task.dependencies?.length > 0 && allTasks.length > 0) {
    const unmet = task.dependencies.filter(depId => {
      const depTask = allTasks.find(t => t.id === depId);
      return depTask && ![WORKFLOW_STATUS.APPROVED, WORKFLOW_STATUS.COMPLETED].includes(depTask.status);
    });

    if (unmet.length > 0) {
      return {
        allowed: false,
        reason: `Cannot start task. Prerequisite dependencies are incomplete: ${unmet.join(', ')}.`
      };
    }
  }

  // 4e. Moving to COMPLETED requires quality check
  if (toStatus === WORKFLOW_STATUS.COMPLETED) {
    if (task.qualityChecklist && task.qualityChecklist.length > 0) {
      const pendingChecks = task.qualityChecklist.filter(q => !q.passed);
      if (pendingChecks.length > 0 && !context.bypassQualityCheck) {
        return {
          allowed: false,
          reason: `Cannot complete task. ${pendingChecks.length} quality inspection items are pending verification.`
        };
      }
    }
  }

  return { allowed: true };
}

// ── 5. Standard Society Workflow Projects Seed Data ───────────────────────────
export const SEED_WORKFLOW_PROJECTS = [
  {
    id: 'PRJ-SOLAR-2026',
    code: 'SOLAR-2026',
    title: 'Rooftop Solar PV & Net Metering',
    category: 'Infrastructure & Sustainability',
    area: 'Rooftop & Electrical Room',
    owner: 'Amit (Secretary) & Energy Committee',
    targetDate: '2026-11-30',
    budget: 850000,
    status: WORKFLOW_STATUS.IN_PROGRESS,
    description: 'Installation of 50 kWp Rooftop Solar Grid-Tied System to offset common area electricity consumption and save ₹65,000/month.',
    scope: [
      'Site structural feasibility audit for Wing A rooftop',
      'Comparative evaluation of 3 empaneled MEDA vendors',
      'DISCOM Tata Power net metering sanction and bi-directional meter setup',
      'Solar panel mounting, inverter wiring and earthing grid testing',
      'Full commissioning and society monitoring dashboard integration'
    ],
    milestones: [
      { id: 'M-SOLAR-1', title: 'Vendor Finalization & AGM Approval', targetDate: '2026-09-15', completed: true },
      { id: 'M-SOLAR-2', title: 'DISCOM Net Metering Application', targetDate: '2026-10-15', completed: true },
      { id: 'M-SOLAR-3', title: 'Panel Structural Erection', targetDate: '2026-11-10', completed: false },
      { id: 'M-SOLAR-4', title: 'Commissioning & Grid Synchronisation', targetDate: '2026-11-30', completed: false },
    ]
  },
  {
    id: 'PRJ-WATER-2026',
    code: 'WATER-2026',
    title: '5,39,400L Water Tanks Hydro-Waterproofing & Automation',
    category: 'Water & Utilities',
    area: 'Basement & Terrace',
    owner: 'Siddu (Manager) & Water Committee',
    targetDate: '2026-12-15',
    budget: 420000,
    status: WORKFLOW_STATUS.IN_PROGRESS,
    description: 'Polymer epoxy food-grade waterproofing for domestic & flushing tanks, ultrasonic IoT level sensor deployment, and valve manifold overhaul.',
    scope: [
      'Chamber 1 & 2 pressure cleaning and sediment decanting',
      'Two-coat epoxy waterproof slurry with anti-microbial seal',
      'Dual IoT ultrasonic sensors with automated pump cutoff',
      'Water tanker decanting pipeline digital flow meter installation'
    ],
    milestones: [
      { id: 'M-WATER-1', title: 'Underground Tank Cleaning & Slurry', targetDate: '2026-10-25', completed: true },
      { id: 'M-WATER-2', title: 'Overhead Tanks 1 to 4 Waterproofing', targetDate: '2026-11-15', completed: false },
      { id: 'M-WATER-3', title: 'IoT Flow & Cutoff Commissioning', targetDate: '2026-12-15', completed: false },
    ]
  },
  {
    id: 'PRJ-FIRE-2026',
    code: 'FIRE-2026',
    title: 'Fire Safety NOC Renewal & Pump Overhaul',
    category: 'Compliance & Safety',
    area: 'Common Area & Pump Room',
    owner: 'Executive Committee',
    targetDate: '2026-10-31',
    budget: 180000,
    status: WORKFLOW_STATUS.IN_REVIEW,
    description: 'Rectification of all pending fire fighting pump valves, riser pressure gauges, sprinkler lines, hose reel nozzles, and Form B submission to Fire Dept.',
    scope: [
      'Main hydrant pump servicing and pressure test to 7 bar',
      'Diesel engine backup pump battery replacement & run test',
      'Wing A refuge floor fire extinguisher inspection and refilling',
      'Certified Fire Auditor inspection and Form B issuance'
    ],
    milestones: [
      { id: 'M-FIRE-1', title: 'Pump Servicing & Riser Testing', targetDate: '2026-10-10', completed: true },
      { id: 'M-FIRE-2', title: 'Form B Audit Inspection', targetDate: '2026-10-20', completed: true },
      { id: 'M-FIRE-3', title: 'Fire Dept Compliance Certificate', targetDate: '2026-10-31', completed: false },
    ]
  },
  {
    id: 'PRJ-BUILDER-2026',
    code: 'BUILDER-2026',
    title: 'Builder Handover & Forensic Audit Punchlist Resolution',
    category: 'Legal & Handover',
    area: 'Campus Wide',
    owner: 'Legal Committee & Chairman',
    targetDate: '2026-12-31',
    budget: 0,
    status: WORKFLOW_STATUS.IN_PROGRESS,
    description: 'Follow-up on 47 critical forensic punchlist defects with builder Eisha, including missing bank accounts, lift certificates, and compound wall repairs.',
    scope: [
      'Issue formal legal notice for clubhouse completion',
      'Structural crack rectification in basement parking',
      'Conveyance deed preparation with Sub-Registrar',
      'Settlement of builder electricity sub-meter dues'
    ],
    milestones: [
      { id: 'M-BLD-1', title: 'Audit Dossier Compilation', targetDate: '2026-08-30', completed: true },
      { id: 'M-BLD-2', title: 'Joint Builder Site Inspection', targetDate: '2026-10-15', completed: true },
      { id: 'M-BLD-3', title: 'Escalation Hearing with Registrar', targetDate: '2026-12-15', completed: false },
    ]
  },
  {
    id: 'PRJ-COMMON-OPS',
    code: 'COMMON-OPS',
    title: 'Campus Civil Works & Amenities Maintenance',
    category: 'Operations',
    area: 'Common Society Area',
    owner: 'Siddu (Estate Manager)',
    targetDate: '2026-11-20',
    budget: 250000,
    status: WORKFLOW_STATUS.IN_PROGRESS,
    description: 'Ongoing infrastructure maintenance including kids play area EPDM flooring, swimming pool filtration sand change, and lighting.',
    scope: [
      'EPDM flooring replacement in kids play area',
      'Speed breaker installation at gates',
      'Swimming pool sand change and drain cover replacement'
    ],
    milestones: [
      { id: 'M-OPS-1', title: 'Kids EPDM Installation', targetDate: '2026-02-02', completed: true },
      { id: 'M-OPS-2', title: 'Pool Filtration Overhaul', targetDate: '2026-11-20', completed: false },
    ]
  }
];

export const SEED_WORKFLOW_TASKS = [
  {
    id: 'WT-001',
    projectId: 'PRJ-SOLAR-2026',
    taskCategory: 'Solar Net Metering Application',
    title: 'File Net Metering Application with Tata Power',
    area: 'Electrical Sub-Station',
    assignedTo: 'Amit (Secretary)',
    vendorName: 'Tata Power / GreenWatts Solar',
    startDate: '2026-10-01',
    deadline: '2026-10-25',
    priority: WORKFLOW_PRIORITY.HIGH,
    status: WORKFLOW_STATUS.APPROVED,
    estimatedCost: 35000,
    actualCost: 35000,
    milestoneId: 'M-SOLAR-2',
    dependencies: [],
    scopeDescription: 'Submit three-phase sanction load documents and application fee for net-meter bi-directional flow.',
    qualityChecklist: [
      { item: 'Sanction letter copy received', passed: true },
      { item: 'Meter test report verified by electrical inspector', passed: true }
    ],
    reviewNotes: 'Verified and approved by Secretary on 2026-10-18.',
    blockerReason: '',
    activityLog: [
      { action: 'CREATED', timestamp: '2026-10-01T10:00:00Z', user: 'Amit' },
      { action: 'SUBMITTED_FOR_REVIEW', timestamp: '2026-10-15T14:30:00Z', user: 'Siddu' },
      { action: 'APPROVED', timestamp: '2026-10-18T11:00:00Z', user: 'Chairman' }
    ]
  },
  {
    id: 'WT-002',
    projectId: 'PRJ-SOLAR-2026',
    taskCategory: 'Solar Panel Structural Erection',
    title: 'Erect Galvalume Mounting Structures on Terrace',
    area: 'Wing A Terrace',
    assignedTo: 'Siddu',
    vendorName: 'GreenWatts Solar',
    startDate: '2026-10-20',
    deadline: '2026-11-05',
    priority: WORKFLOW_PRIORITY.HIGH,
    status: WORKFLOW_STATUS.IN_PROGRESS,
    estimatedCost: 220000,
    actualCost: 0,
    milestoneId: 'M-SOLAR-3',
    dependencies: ['WT-001'],
    scopeDescription: 'Anchor wind-resistant mounting frames with non-penetrating chemical anchors to protect terrace waterproofing.',
    qualityChecklist: [
      { item: 'Wind resistance certification (150 km/h)', passed: true },
      { item: 'Terrace waterproofing membrane integrity intact', passed: false },
      { item: 'Earthing spike resistance below 2 Ohms', passed: false }
    ],
    reviewNotes: '',
    blockerReason: '',
    activityLog: [
      { action: 'CREATED', timestamp: '2026-10-01T10:00:00Z', user: 'Amit' },
      { action: 'MOVED_TO_IN_PROGRESS', timestamp: '2026-10-20T09:00:00Z', user: 'Siddu' }
    ]
  },
  {
    id: 'WT-003',
    projectId: 'PRJ-FIRE-2026',
    taskCategory: 'Fire Safety Works',
    title: 'Fire Pump Servicing & Sprinkler Pressure Test',
    area: 'Basement Pump Room',
    assignedTo: 'Siddu',
    vendorName: 'SafeGuard Fire Systems',
    startDate: '2026-10-05',
    deadline: '2026-10-28',
    priority: WORKFLOW_PRIORITY.CRITICAL,
    status: WORKFLOW_STATUS.IN_REVIEW,
    estimatedCost: 85000,
    actualCost: 82000,
    milestoneId: 'M-FIRE-1',
    dependencies: [],
    scopeDescription: 'Rectification of all pending fire-related issues and ensuring the fire pump is fully operational with pressure test report.',
    qualityChecklist: [
      { item: 'Main pump reaches 7.5 kg/cm2 pressure', passed: true },
      { item: 'Jockey pump auto-trigger upon line pressure drop', passed: true },
      { item: 'Diesel backup starts within 15 seconds of power cut', passed: true }
    ],
    reviewNotes: 'Vendor completed on-site servicing. Test certificate attached. Submitted for Committee signoff.',
    blockerReason: '',
    activityLog: [
      { action: 'CREATED', timestamp: '2026-10-05T09:00:00Z', user: 'Manager' },
      { action: 'SUBMITTED_FOR_REVIEW', timestamp: '2026-10-19T16:00:00Z', user: 'Siddu' }
    ]
  },
  {
    id: 'WT-004',
    projectId: 'PRJ-WATER-2026',
    taskCategory: 'Underground Tank Epoxy Slurry',
    title: 'Food-Grade Waterproofing of Tank Compartment 1',
    area: 'Underground Water Tank',
    assignedTo: 'Siddu',
    vendorName: 'AquaShield Technologies',
    startDate: '2026-10-10',
    deadline: '2026-10-25',
    priority: WORKFLOW_PRIORITY.HIGH,
    status: WORKFLOW_STATUS.BLOCKED,
    estimatedCost: 140000,
    actualCost: 50000,
    milestoneId: 'M-WATER-1',
    dependencies: [],
    scopeDescription: 'Drain and scrub chamber 1, fill expansion joints with polyurethane sealant, and apply dual-coat epoxy.',
    qualityChecklist: [
      { item: 'Sediment cleaning to bare concrete', passed: true },
      { item: 'Curing period of 72 hours observed', passed: false },
      { item: 'Water potability lab test certificate', passed: false }
    ],
    reviewNotes: '',
    blockerReason: 'Awaiting specialized solvent-free epoxy resin delivery from supplier due to transport delay.',
    severity: WORKFLOW_SEVERITY.HIGH,
    activityLog: [
      { action: 'CREATED', timestamp: '2026-10-10T09:00:00Z', user: 'Siddu' },
      { action: 'BLOCKED', timestamp: '2026-10-18T10:30:00Z', user: 'Siddu', notes: 'Material supply chain delay' }
    ]
  },
  {
    id: 'WT-005',
    projectId: 'PRJ-BUILDER-2026',
    taskCategory: 'Builder Discussion',
    title: 'Punchlist Point 14: Basement Seepage Rectification Notice',
    area: 'Basement Parking Wing A',
    assignedTo: 'Legal Committee / Amit',
    vendorName: 'Eisha Developers',
    startDate: '2026-10-01',
    deadline: '2026-11-15',
    priority: WORKFLOW_PRIORITY.CRITICAL,
    status: WORKFLOW_STATUS.READY,
    estimatedCost: 0,
    actualCost: 0,
    milestoneId: 'M-BLD-2',
    dependencies: [],
    scopeDescription: 'Issue final 15-day rectification notice under Maharashtra Ownership Flats Act (MOFA) for structural seepage around pillar P-12.',
    qualityChecklist: [
      { item: 'Photographic evidence tagged with date and meter', passed: true },
      { item: 'Chartered Structural Engineer affidavit attached', passed: true }
    ],
    reviewNotes: '',
    blockerReason: '',
    activityLog: [
      { action: 'CREATED', timestamp: '2026-10-01T10:00:00Z', user: 'Amit' },
      { action: 'MOVED_TO_READY', timestamp: '2026-10-15T12:00:00Z', user: 'Chairman' }
    ]
  },
  {
    id: 'WT-006',
    projectId: 'PRJ-COMMON-OPS',
    taskCategory: 'EPDM Kids Play Area',
    title: 'Install Shock-Absorbing EPDM Flooring in Play Area',
    area: 'Common Play Ground',
    assignedTo: 'Siddu / Amit',
    vendorName: 'S3 Sports',
    startDate: '2026-01-28',
    deadline: '2026-02-02',
    priority: WORKFLOW_PRIORITY.HIGH,
    status: WORKFLOW_STATUS.COMPLETED,
    estimatedCost: 185000,
    actualCost: 182000,
    milestoneId: 'M-OPS-1',
    dependencies: [],
    scopeDescription: 'Complete 25mm double-layer seamless EPDM safety surfacing with colorful hopscotch graphics.',
    qualityChecklist: [
      { item: 'Impact attenuation test passed', passed: true },
      { item: 'Edge beveling and drainage channels clear', passed: true },
      { item: '5-year vendor material warranty handed over', passed: true }
    ],
    reviewNotes: 'Work inspected on site by Secretary and Treasurer. Signoff executed.',
    blockerReason: '',
    activityLog: [
      { action: 'CREATED', timestamp: '2026-01-28T10:00:00Z', user: 'Siddu' },
      { action: 'COMPLETED', timestamp: '2026-02-02T16:00:00Z', user: 'Amit' }
    ]
  },
  {
    id: 'WT-007',
    projectId: 'PRJ-COMMON-OPS',
    taskCategory: 'Swimming Pool Maintenance',
    title: 'Sand Filter Replacement & Drain Cover Grating',
    area: 'Clubhouse Pool',
    assignedTo: 'Siddu',
    vendorName: 'BlueOcean Pools',
    startDate: '2026-10-15',
    deadline: '2026-11-10',
    priority: WORKFLOW_PRIORITY.MEDIUM,
    status: WORKFLOW_STATUS.PLANNED,
    estimatedCost: 45000,
    actualCost: 0,
    milestoneId: 'M-OPS-2',
    dependencies: [],
    scopeDescription: 'Replace 400kg silica sand media with activated glass media for 50% better filtration and install anti-vortex drain covers.',
    qualityChecklist: [
      { item: 'Glass filter media turbidity test under 0.5 NTU', passed: false },
      { item: 'Anti-entrapment suction cover compliance', passed: false }
    ],
    reviewNotes: '',
    blockerReason: '',
    activityLog: [
      { action: 'CREATED', timestamp: '2026-10-15T11:00:00Z', user: 'Siddu' }
    ]
  }
];

// ── 6. Metrics & KPI Aggregation ──────────────────────────────────────────────
export function calculateWorkflowMetrics(projects = [], tasks = []) {
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => [WORKFLOW_STATUS.IN_PROGRESS, WORKFLOW_STATUS.READY].includes(p.status)).length;
  const completedProjects = projects.filter(p => p.status === WORKFLOW_STATUS.COMPLETED).length;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === WORKFLOW_STATUS.COMPLETED).length;
  const approvedTasks = tasks.filter(t => t.status === WORKFLOW_STATUS.APPROVED).length;
  const inProgressTasks = tasks.filter(t => t.status === WORKFLOW_STATUS.IN_PROGRESS).length;
  const inReviewTasks = tasks.filter(t => t.status === WORKFLOW_STATUS.IN_REVIEW).length;
  const blockedTasks = tasks.filter(t => t.status === WORKFLOW_STATUS.BLOCKED).length;
  const readyTasks = tasks.filter(t => t.status === WORKFLOW_STATUS.READY).length;
  const plannedTasks = tasks.filter(t => t.status === WORKFLOW_STATUS.PLANNED).length;
  const draftTasks = tasks.filter(t => t.status === WORKFLOW_STATUS.DRAFT).length;
  const cancelledTasks = tasks.filter(t => t.status === WORKFLOW_STATUS.CANCELLED).length;

  // Overdue calculation
  const now = new Date();
  const overdueTasks = tasks.filter(t => {
    if (!t.deadline || [WORKFLOW_STATUS.COMPLETED, WORKFLOW_STATUS.CANCELLED].includes(t.status)) return false;
    const deadlineDate = new Date(t.deadline);
    return !isNaN(deadlineDate.getTime()) && deadlineDate < now;
  }).length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const executionVelocityRate = totalTasks > 0 ? Math.round(((completedTasks + approvedTasks) / totalTasks) * 100) : 0;

  // Total budgets and spend
  const totalEstimatedCost = tasks.reduce((sum, t) => sum + (Number(t.estimatedCost) || 0), 0);
  const totalActualCost = tasks.reduce((sum, t) => sum + (Number(t.actualCost) || 0), 0);

  return {
    totalProjects,
    activeProjects,
    completedProjects,
    totalTasks,
    completedTasks,
    approvedTasks,
    inProgressTasks,
    inReviewTasks,
    blockedTasks,
    readyTasks,
    plannedTasks,
    draftTasks,
    cancelledTasks,
    overdueTasks,
    completionRate,
    executionVelocityRate,
    totalEstimatedCost,
    totalActualCost,
    statusBreakdown: {
      [WORKFLOW_STATUS.DRAFT]: draftTasks,
      [WORKFLOW_STATUS.PLANNED]: plannedTasks,
      [WORKFLOW_STATUS.READY]: readyTasks,
      [WORKFLOW_STATUS.IN_PROGRESS]: inProgressTasks,
      [WORKFLOW_STATUS.BLOCKED]: blockedTasks,
      [WORKFLOW_STATUS.IN_REVIEW]: inReviewTasks,
      [WORKFLOW_STATUS.APPROVED]: approvedTasks,
      [WORKFLOW_STATUS.REJECTED]: tasks.filter(t => t.status === WORKFLOW_STATUS.REJECTED).length,
      [WORKFLOW_STATUS.COMPLETED]: completedTasks,
      [WORKFLOW_STATUS.CANCELLED]: cancelledTasks
    }
  };
}

// ── 7. Data Persistence & Firebase Integration ────────────────────────────────
const LOCAL_STORAGE_PROJECTS_KEY = 'majestique_workflow_projects_v1';
const LOCAL_STORAGE_TASKS_KEY = 'majestique_workflow_tasks_v1';

/**
 * Loads all workflow projects from Firestore (with fallback to local storage / seed).
 */
export async function loadWorkflowProjects() {
  if (isFirebaseConfigured && db) {
    try {
      await ensureFirebaseSession();
      const snap = await getDocs(collection(db, 'workflowProjects'));
      if (!snap.empty) {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(items));
        return items;
      }
    } catch {
      // Fallback below
    }
  }

  // Fallback to local storage or seed
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY);
    if (cached) return JSON.parse(cached);
  } catch {
    // ignore
  }

  localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(SEED_WORKFLOW_PROJECTS));
  return SEED_WORKFLOW_PROJECTS;
}

/**
 * Loads all workflow tasks from Firestore (with fallback to local storage / seed).
 */
export async function loadWorkflowTasks() {
  if (isFirebaseConfigured && db) {
    try {
      await ensureFirebaseSession();
      const snap = await getDocs(collection(db, 'workflowTasks'));
      if (!snap.empty) {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(items));
        return items;
      }
    } catch {
      // Fallback below
    }
  }

  // Fallback to local storage or seed
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_TASKS_KEY);
    if (cached) return JSON.parse(cached);
  } catch {
    // ignore
  }

  localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(SEED_WORKFLOW_TASKS));
  return SEED_WORKFLOW_TASKS;
}

/**
 * Saves or updates a workflow project with audit trail.
 */
export async function saveWorkflowProject(project, user = null, userRole = null) {
  if (!project.id) {
    project.id = `PRJ-${Date.now().toString(36).toUpperCase()}`;
  }

  // Save to LocalStorage
  const cached = await loadWorkflowProjects();
  const idx = cached.findIndex(p => p.id === project.id);
  const updatedList = idx >= 0
    ? cached.map(p => p.id === project.id ? { ...p, ...project, updatedAt: new Date().toISOString() } : p)
    : [...cached, { ...project, createdAt: new Date().toISOString() }];
  localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(updatedList));

  // Save to Firestore
  if (isFirebaseConfigured && db) {
    try {
      await ensureFirebaseSession();
      await setDoc(doc(db, 'workflowProjects', project.id), {
        ...project,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore write warning for project:', err);
    }
  }

  // Audit event
  logAuditEvent({
    action: idx >= 0 ? AUDIT_ACTIONS.UPDATE : AUDIT_ACTIONS.CREATE,
    module: 'WorkflowProjects',
    recordId: project.id,
    notes: `Project "${project.title}" saved in status ${project.status}`,
    user,
    role: userRole
  });

  return project;
}

/**
 * Saves or updates a workflow task, enforcing transition validation and logging audit trails.
 */
export async function saveWorkflowTask(task, user = null, userRole = null, context = {}) {
  if (!task.id) {
    task.id = `WT-${Date.now().toString(36).toUpperCase()}`;
  }

  const existingTasks = await loadWorkflowTasks();
  const prevTask = existingTasks.find(t => t.id === task.id);

  // Validate status transition if changing
  if (prevTask && prevTask.status !== task.status) {
    const validation = validateStatusTransition(prevTask, task.status, userRole, context, existingTasks);
    if (!validation.allowed) {
      throw new Error(validation.reason || 'Invalid status transition.');
    }

    // Append to activity log
    const activityEntry = {
      action: `TRANSITION_${task.status.toUpperCase().replace(/\s+/g, '_')}`,
      from: prevTask.status,
      to: task.status,
      timestamp: new Date().toISOString(),
      user: user?.email || userRole || 'Anonymous',
      notes: context.reviewNotes || context.blockerReason || context.resolutionNotes || context.remarks || ''
    };
    task.activityLog = [...(task.activityLog || []), activityEntry];
  }

  // Save to LocalStorage
  const updatedList = prevTask
    ? existingTasks.map(t => t.id === task.id ? { ...t, ...task, updatedAt: new Date().toISOString() } : t)
    : [...existingTasks, { ...task, createdAt: new Date().toISOString() }];
  localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(updatedList));

  // Save to Firestore
  if (isFirebaseConfigured && db) {
    try {
      await ensureFirebaseSession();
      await setDoc(doc(db, 'workflowTasks', task.id), {
        ...task,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore write warning for task:', err);
    }
  }

  // Audit event
  logAuditEvent({
    action: prevTask ? AUDIT_ACTIONS.UPDATE : AUDIT_ACTIONS.CREATE,
    module: 'WorkflowTasks',
    recordId: task.id,
    notes: `Task "${task.title || task.taskCategory}" updated to ${task.status}`,
    user,
    role: userRole
  });

  return task;
}

/**
 * Deletes a workflow task.
 */
export async function deleteWorkflowTask(taskId, user = null, userRole = null) {
  const existingTasks = await loadWorkflowTasks();
  const taskToDelete = existingTasks.find(t => t.id === taskId);
  const updatedList = existingTasks.filter(t => t.id !== taskId);
  localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(updatedList));

  if (isFirebaseConfigured && db) {
    try {
      await ensureFirebaseSession();
      await deleteDoc(doc(db, 'workflowTasks', taskId));
    } catch (err) {
      console.warn('Firestore delete error for task:', err);
    }
  }

  logAuditEvent({
    action: AUDIT_ACTIONS.DELETE,
    module: 'WorkflowTasks',
    recordId: taskId,
    notes: `Task "${taskToDelete?.title || taskId}" deleted.`,
    user,
    role: userRole
  });
}
