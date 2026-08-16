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

// ── Shared test data ─────────────────────────────────────────────
const baseStats = {
  duesCollected: 500000,
  totalOutstanding: 120000,
  collectionRate: 80.6,
  openComplaints: 3,
  activeVisitors: 12,
  staffPresent: 8,
  financeSnapshot: { collections: 500000, expenses: 320000 },
  nextEvent: { title: 'AGM Meeting', date: '15 May' },
};

describe('MainDashboard – static content', () => {
  it('renders the Society Overview heading', () => {
    render(<MainDashboard stats={baseStats} />);
    expect(screen.getByRole('heading', { name: /Society Overview/i })).toBeInTheDocument();
  });

  it('renders the Residential Management Dashboard description', () => {
    render(<MainDashboard stats={baseStats} />);
    expect(screen.getByText(/Residential Management Dashboard/i)).toBeInTheDocument();
  });

  it('renders the Cheques quick-action button in admin mode', () => {
    render(<MainDashboard stats={baseStats} isAdmin={true} />);
    expect(screen.getByRole('button', { name: /cheques/i })).toBeInTheDocument();
  });
});

describe('MainDashboard – metric cards', () => {
  it('displays the collection rate', () => {
    render(<MainDashboard stats={baseStats} />);
    expect(screen.getByText('80.6%')).toBeInTheDocument();
  });

  it('displays the outstanding dues in INR format', () => {
    render(<MainDashboard stats={baseStats} />);
    expect(screen.getByText(/₹1\.2L/)).toBeInTheDocument();
  });

  it('displays the staff count', () => {
    render(<MainDashboard stats={baseStats} />);
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('displays open complaints count', () => {
    render(<MainDashboard stats={baseStats} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows complaints value in red when count > 5', () => {
    const highStats = { ...baseStats, openComplaints: 6 };
    render(<MainDashboard stats={highStats} />);
    const val = screen.getByText('6');
    expect(val).toHaveStyle({ color: '#dc2626' });
  });

  it('shows complaints value in dark when count ≤ 5', () => {
    render(<MainDashboard stats={baseStats} />);
    const val = screen.getByText('3');
    expect(val).toHaveStyle({ color: '#0f172a' });
  });
});

describe('MainDashboard – finance snapshot', () => {
  it('renders Monthly Surplus label', () => {
    render(<MainDashboard stats={baseStats} />);
    expect(screen.getByText(/monthly surplus/i)).toBeInTheDocument();
  });

  it('renders Income vs Expense Trend heading', () => {
    render(<MainDashboard stats={baseStats} />);
    expect(screen.getByText(/income vs expense trend/i)).toBeInTheDocument();
  });

  it('formats surplus correctly', () => {
    render(<MainDashboard stats={baseStats} />);
    // 500000 collections, 320000 expenses -> 180000 surplus -> formatted to ₹1.8L
    expect(screen.getByText(/₹1\.8L/)).toBeInTheDocument();
  });
});

describe('MainDashboard – operations section', () => {
  it('shows Active Visitors count', () => {
    render(<MainDashboard stats={baseStats} />);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('shows Next Event title when provided', () => {
    render(<MainDashboard stats={baseStats} />);
    expect(screen.getByText('AGM Meeting')).toBeInTheDocument();
  });

  it('shows Next Event date', () => {
    render(<MainDashboard stats={baseStats} />);
    expect(screen.getByText('15 May')).toBeInTheDocument();
  });

  it('does not render Next Event section when no next event is set', () => {
    const noEvent = { ...baseStats, nextEvent: null };
    render(<MainDashboard stats={noEvent} />);
    expect(screen.queryByText('📅 Next Event')).not.toBeInTheDocument();
  });
});

describe('MainDashboard – Cheque Tracker quick-action', () => {
  it('dispatches a changeTab CustomEvent with detail "cheques" when clicked', () => {
    render(<MainDashboard stats={baseStats} isAdmin={true} />);
    const listener = vi.fn();
    window.addEventListener('changeTab', listener);

    fireEvent.click(screen.getByRole('button', { name: /cheques/i }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toBe('cheques');

    window.removeEventListener('changeTab', listener);
  });
});
