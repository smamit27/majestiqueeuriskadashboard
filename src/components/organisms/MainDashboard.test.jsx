import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MainDashboard from './MainDashboard';

// ── Recharts uses SVG/ResizeObserver – mock ResponsiveContainer ──
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  };
});

describe('MainDashboard – redesigned society overview', () => {
  it('renders the Society Overview heading', () => {
    render(<MainDashboard isAdmin={true} />);
    expect(screen.getByRole('heading', { name: /Society Overview/i })).toBeInTheDocument();
  });

  it('renders the AGM governance banner', () => {
    render(<MainDashboard isAdmin={true} />);
    expect(screen.getByText(/AGM 2026, AGM 2025 & SGM 2025 Minutes & Resolutions Stored/i)).toBeInTheDocument();
    expect(screen.getByText(/AGM 2026 \(06\.09\.2026\)/i)).toBeInTheDocument();
    expect(screen.getByText(/AGM 2025 \(02\.11\.2025\)/i)).toBeInTheDocument();
    expect(screen.getByText(/SGM 2025 \(15\.06\.2025\)/i)).toBeInTheDocument();
  });

  it('dispatches a changeTab event with detail "agm_records" when Open AGM Archive is clicked', () => {
    render(<MainDashboard isAdmin={true} />);
    const listener = vi.fn();
    window.addEventListener('changeTab', listener);

    fireEvent.click(screen.getByRole('button', { name: /Open AGM Archive →/i }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toBe('agm_records');

    window.removeEventListener('changeTab', listener);
  });

  it('renders key KPI cards: Total Flats, Tasks, Overdue, Shop Dues, Petty Cash', () => {
    render(<MainDashboard isAdmin={true} />);
    expect(screen.getByText('Total Flats')).toBeInTheDocument();
    expect(screen.getByText('Tasks Completed')).toBeInTheDocument();
    expect(screen.getByText('Overdue Tasks')).toBeInTheDocument();
    expect(screen.getByText('Shop Dues')).toBeInTheDocument();
    expect(screen.getByText('Petty Cash Spent')).toBeInTheDocument();
  });

  it('renders Income vs Expense Trend section', () => {
    render(<MainDashboard isAdmin={true} />);
    expect(screen.getByText(/Income vs Expense Trend/i)).toBeInTheDocument();
  });

  it('renders the Cheques quick-action button in admin mode and dispatches changeTab', () => {
    render(<MainDashboard isAdmin={true} />);
    const listener = vi.fn();
    window.addEventListener('changeTab', listener);

    const chequesBtn = screen.getByRole('button', { name: /cheques/i });
    expect(chequesBtn).toBeInTheDocument();
    fireEvent.click(chequesBtn);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toBe('cheques');

    window.removeEventListener('changeTab', listener);
  });

  it('renders AGM 2026 button in Quick Navigation and dispatches changeTab', () => {
    render(<MainDashboard isAdmin={true} />);
    const listener = vi.fn();
    window.addEventListener('changeTab', listener);

    const agmBtns = screen.getAllByRole('button', { name: /AGM 2026/i });
    expect(agmBtns.length).toBeGreaterThan(0);
    fireEvent.click(agmBtns[0]);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toBe('agm_records');

    window.removeEventListener('changeTab', listener);
  });
});
