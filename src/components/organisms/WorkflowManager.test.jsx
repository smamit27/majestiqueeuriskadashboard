import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import WorkflowManager from './WorkflowManager.jsx';
import { ROLES } from '../../services/rbacService.js';
import { SEED_WORKFLOW_PROJECTS, SEED_WORKFLOW_TASKS } from '../../services/workflowService.js';

vi.mock('../../firebase.js', () => ({
  db: null,
  ensureFirebaseSession: vi.fn().mockResolvedValue(null),
  isFirebaseConfigured: false
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
  setDoc: vi.fn().mockResolvedValue(),
  deleteDoc: vi.fn().mockResolvedValue(),
  serverTimestamp: vi.fn()
}));

describe('WorkflowManager Component', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('majestique_workflow_projects_v1', JSON.stringify(SEED_WORKFLOW_PROJECTS));
    localStorage.setItem('majestique_workflow_tasks_v1', JSON.stringify(SEED_WORKFLOW_TASKS));
  });

  it('renders header, title, and initial KPI cards', async () => {
    render(<WorkflowManager isAdmin={true} userRole={ROLES.ADMIN} user={{ email: 'admin@euriska.com' }} />);

    expect(screen.getByText(/Society Project & Workflow Engine/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Projects/i)).toBeInTheDocument();
    expect(screen.getByText(/Execution Progress/i)).toBeInTheDocument();
    expect(screen.getByText(/Blocked Tasks/i)).toBeInTheDocument();
  });

  it('renders kanban lanes and task cards', async () => {
    render(<WorkflowManager isAdmin={true} userRole={ROLES.CHAIRMAN} user={{ email: 'chairman@euriska.com' }} />);

    await waitFor(() => {
      expect(screen.getByText(/Planning & Backlog/i)).toBeInTheDocument();
      expect(screen.getByText(/Active Execution/i)).toBeInTheDocument();
      expect(screen.getByText(/Blocked \/ Needs Action/i)).toBeInTheDocument();
    });

    // Check for seeded tasks
    expect(screen.getByText(/Erect Galvalume Mounting Structures on Terrace/i)).toBeInTheDocument();
    expect(screen.getByText(/Fire Pump Servicing & Sprinkler Pressure Test/i)).toBeInTheDocument();
  });

  it('switches to List & Table view and renders data table', async () => {
    render(<WorkflowManager isAdmin={true} userRole={ROLES.SECRETARY} user={{ email: 'secretary@euriska.com' }} />);

    const listTabBtn = screen.getByText(/List & Table/i);
    fireEvent.click(listTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/Title & Scope/i)).toBeInTheDocument();
      expect(screen.getByText(/Task ID/i)).toBeInTheDocument();
      expect(screen.getByText(/WT-001/i)).toBeInTheDocument();
    });
  });

  it('switches to Projects Overview and renders project cards and milestones', async () => {
    render(<WorkflowManager isAdmin={true} userRole={ROLES.MANAGER} user={{ email: 'manager@euriska.com' }} />);

    const overviewBtn = screen.getByText(/Projects Overview/i);
    fireEvent.click(overviewBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Rooftop Solar PV & Net Metering/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/5,39,400L Water Tanks Hydro-Waterproofing & Automation/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Key Scope & Deliverables:/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('switches to Approval Desk and renders pending review queue', async () => {
    render(<WorkflowManager isAdmin={true} userRole={ROLES.CHAIRMAN} user={{ email: 'chairman@euriska.com' }} />);

    const approvalsBtn = screen.getByText(/Approval Desk/i);
    fireEvent.click(approvalsBtn);

    await waitFor(() => {
      expect(screen.getByText(/Executive Committee Review & Quality Gate/i)).toBeInTheDocument();
      expect(screen.getByText(/Approve Work/i)).toBeInTheDocument();
      expect(screen.getByText(/Request Rework/i)).toBeInTheDocument();
    });
  });

  it('opens task detail drawer when clicking a task card', async () => {
    render(<WorkflowManager isAdmin={true} userRole={ROLES.ADMIN} user={{ email: 'admin@euriska.com' }} />);

    await waitFor(() => {
      expect(screen.getByText(/Erect Galvalume Mounting Structures on Terrace/i)).toBeInTheDocument();
    });

    const card = screen.getByText(/Erect Galvalume Mounting Structures on Terrace/i);
    fireEvent.click(card);

    await waitFor(() => {
      expect(screen.getByText(/Quality Acceptance Checklist/i)).toBeInTheDocument();
      expect(screen.getByText(/Audit History & Transitions/i)).toBeInTheDocument();
    });
  });

  it('filters tasks by search input', async () => {
    render(<WorkflowManager isAdmin={true} userRole={ROLES.MANAGER} user={{ email: 'manager@euriska.com' }} />);

    const searchInput = screen.getByPlaceholderText(/Search tasks, categories.../i);
    fireEvent.change(searchInput, { target: { value: 'Fire Pump' } });

    await waitFor(() => {
      expect(screen.getByText(/Fire Pump Servicing & Sprinkler Pressure Test/i)).toBeInTheDocument();
      expect(screen.queryByText(/Erect Galvalume Mounting Structures on Terrace/i)).not.toBeInTheDocument();
    });
  });
});
