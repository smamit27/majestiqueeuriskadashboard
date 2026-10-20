import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  WORKFLOW_STATUS,
  validateStatusTransition,
  calculateWorkflowMetrics,
  SEED_WORKFLOW_PROJECTS,
  SEED_WORKFLOW_TASKS,
  loadWorkflowProjects,
  loadWorkflowTasks,
  saveWorkflowTask
} from './workflowService.js';
import { ROLES } from './rbacService.js';

describe('Workflow Service - State Machine & Transitions', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('defines exactly the 10 formal workflow statuses', () => {
    const statuses = Object.values(WORKFLOW_STATUS);
    expect(statuses).toHaveLength(10);
    expect(statuses).toContain('Draft');
    expect(statuses).toContain('Planned');
    expect(statuses).toContain('Ready');
    expect(statuses).toContain('In Progress');
    expect(statuses).toContain('Blocked');
    expect(statuses).toContain('In Review');
    expect(statuses).toContain('Approved');
    expect(statuses).toContain('Rejected');
    expect(statuses).toContain('Completed');
    expect(statuses).toContain('Cancelled');
  });

  it('allows same-status transition as a safe no-op', () => {
    const task = { id: 'T1', status: WORKFLOW_STATUS.IN_PROGRESS };
    const result = validateStatusTransition(task, WORKFLOW_STATUS.IN_PROGRESS, ROLES.MANAGER);
    expect(result.allowed).toBe(true);
  });

  it('rejects invalid state transition according to transition graph', () => {
    // Draft directly to Approved is invalid
    const task = { id: 'T1', status: WORKFLOW_STATUS.DRAFT };
    const result = validateStatusTransition(task, WORKFLOW_STATUS.APPROVED, ROLES.ADMIN);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Invalid transition');
  });

  it('prevents read-only resident role from altering workflow status', () => {
    const task = { id: 'T1', status: WORKFLOW_STATUS.DRAFT };
    const result = validateStatusTransition(task, WORKFLOW_STATUS.PLANNED, ROLES.RESIDENT);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('read-only access');
  });

  it('requires blockerReason when transitioning to BLOCKED', () => {
    const task = { id: 'T1', status: WORKFLOW_STATUS.IN_PROGRESS };
    // Missing reason
    const failedResult = validateStatusTransition(task, WORKFLOW_STATUS.BLOCKED, ROLES.MANAGER, { blockerReason: '' });
    expect(failedResult.allowed).toBe(false);
    expect(failedResult.reason).toContain('Blocker Reason');

    // Valid reason
    const successResult = validateStatusTransition(task, WORKFLOW_STATUS.BLOCKED, ROLES.MANAGER, {
      blockerReason: 'Vendor delayed cement delivery'
    });
    expect(successResult.allowed).toBe(true);
  });

  it('requires resolution notes when unblocking a task', () => {
    const task = { id: 'T1', status: WORKFLOW_STATUS.BLOCKED, blockerReason: 'Waiting for parts' };
    
    // Attempt to move to In Progress without notes
    const failedResult = validateStatusTransition(task, WORKFLOW_STATUS.IN_PROGRESS, ROLES.MANAGER, {});
    expect(failedResult.allowed).toBe(false);
    expect(failedResult.reason).toContain('Resolution notes');

    // With resolution notes
    const successResult = validateStatusTransition(task, WORKFLOW_STATUS.IN_PROGRESS, ROLES.MANAGER, {
      resolutionNotes: 'Parts received and inspected on site'
    });
    expect(successResult.allowed).toBe(true);
  });

  it('enforces approver gate: only Chairman/Secretary/Treasurer/Admin can approve or reject', () => {
    const task = { id: 'T1', status: WORKFLOW_STATUS.IN_REVIEW };

    // Manager cannot approve
    const managerResult = validateStatusTransition(task, WORKFLOW_STATUS.APPROVED, ROLES.MANAGER);
    expect(managerResult.allowed).toBe(false);
    expect(managerResult.reason).toContain('Only Society Approvers');

    // Secretary can approve
    const secretaryResult = validateStatusTransition(task, WORKFLOW_STATUS.APPROVED, ROLES.SECRETARY);
    expect(secretaryResult.allowed).toBe(true);

    // Treasurer can approve
    const treasurerResult = validateStatusTransition(task, WORKFLOW_STATUS.APPROVED, ROLES.TREASURER);
    expect(treasurerResult.allowed).toBe(true);

    // Rejection requires feedback
    const rejectedWithoutFeedback = validateStatusTransition(task, WORKFLOW_STATUS.REJECTED, ROLES.CHAIRMAN, { rejectionReason: '' });
    expect(rejectedWithoutFeedback.allowed).toBe(false);
    expect(rejectedWithoutFeedback.reason).toContain('feedback is required');

    const rejectedWithFeedback = validateStatusTransition(task, WORKFLOW_STATUS.REJECTED, ROLES.CHAIRMAN, {
      rejectionReason: 'Pressure gauge reading does not meet 7.5 bar requirement'
    });
    expect(rejectedWithFeedback.allowed).toBe(true);
  });

  it('blocks transition to IN_PROGRESS if prerequisite dependencies are incomplete', () => {
    const allTasks = [
      { id: 'DEP-1', status: WORKFLOW_STATUS.IN_PROGRESS },
      { id: 'DEP-2', status: WORKFLOW_STATUS.COMPLETED },
      { id: 'T-MAIN', status: WORKFLOW_STATUS.READY, dependencies: ['DEP-1', 'DEP-2'] }
    ];
    const mainTask = allTasks[2];

    const result = validateStatusTransition(mainTask, WORKFLOW_STATUS.IN_PROGRESS, ROLES.MANAGER, {}, allTasks);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Prerequisite dependencies are incomplete');

    // Mark DEP-1 as COMPLETED
    allTasks[0].status = WORKFLOW_STATUS.COMPLETED;
    const readyResult = validateStatusTransition(mainTask, WORKFLOW_STATUS.IN_PROGRESS, ROLES.MANAGER, {}, allTasks);
    expect(readyResult.allowed).toBe(true);
  });

  it('validates quality check items before marking task COMPLETED', () => {
    const taskWithChecks = {
      id: 'T1',
      status: WORKFLOW_STATUS.APPROVED,
      qualityChecklist: [
        { item: 'Leak test', passed: true },
        { item: 'Lab water potability certificate', passed: false }
      ]
    };

    const failed = validateStatusTransition(taskWithChecks, WORKFLOW_STATUS.COMPLETED, ROLES.ADMIN, {});
    expect(failed.allowed).toBe(false);
    expect(failed.reason).toContain('quality inspection items are pending');

    // When all checks pass
    taskWithChecks.qualityChecklist[1].passed = true;
    const passed = validateStatusTransition(taskWithChecks, WORKFLOW_STATUS.COMPLETED, ROLES.ADMIN, {});
    expect(passed.allowed).toBe(true);
  });

  it('calculates comprehensive workflow metrics accurately', () => {
    const metrics = calculateWorkflowMetrics(SEED_WORKFLOW_PROJECTS, SEED_WORKFLOW_TASKS);

    expect(metrics.totalProjects).toBe(SEED_WORKFLOW_PROJECTS.length);
    expect(metrics.totalTasks).toBe(SEED_WORKFLOW_TASKS.length);
    expect(metrics.completedTasks).toBeGreaterThanOrEqual(1);
    expect(metrics.blockedTasks).toBeGreaterThanOrEqual(1);
    expect(metrics.completionRate).toBeGreaterThan(0);
    expect(metrics.statusBreakdown[WORKFLOW_STATUS.COMPLETED]).toBe(metrics.completedTasks);
    expect(metrics.totalEstimatedCost).toBeGreaterThan(0);
  });

  it('loads seeded projects and tasks if storage is empty', async () => {
    const projects = await loadWorkflowProjects();
    const tasks = await loadWorkflowTasks();

    expect(projects.length).toBeGreaterThan(0);
    expect(tasks.length).toBeGreaterThan(0);
    expect(projects[0].id).toBe('PRJ-SOLAR-2026');
  });

  it('records audit activity entry on valid task transition save', async () => {
    const task = {
      id: 'WT-003',
      projectId: 'PRJ-FIRE-2026',
      status: WORKFLOW_STATUS.IN_REVIEW,
      activityLog: []
    };

    // Transition to Approved
    const updated = await saveWorkflowTask(
      { ...task, status: WORKFLOW_STATUS.APPROVED },
      { email: 'secretary@euriska.com' },
      ROLES.SECRETARY,
      { reviewNotes: 'Approved during Sunday Committee meeting' }
    );

    expect(updated.status).toBe(WORKFLOW_STATUS.APPROVED);
    expect(updated.activityLog.length).toBeGreaterThan(0);
    expect(updated.activityLog[0].to).toBe(WORKFLOW_STATUS.APPROVED);
    expect(updated.activityLog[0].notes).toContain('Approved during Sunday');
  });
});
