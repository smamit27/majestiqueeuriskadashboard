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
  it('renders the SOCIETY MANAGEMENT DASHBOARD heading', () => {
    render(<MainDashboard stats={baseStats} />);
    expect(screen.getByText(/society management dashboard/i)).toBeInTheDocument();
  });

  it('renders the "Welcome back, Admin" eyebrow text', () => {
    render(<MainDashboard stats={baseStats} />);
    expect(screen.getByText(/welcome back, admin/i)).toBeInTheDocument();
  });

  it('renders the Cheque Tracker quick-action button', () => {
    render(<MainDashboard stats={baseStats} />);
    expect(screen.getByRole('button', { name: /cheque tracker/i })).toBeInTheDocument();
  });
});

describe('MainDashboard – metric cards', () => {
  it('displays the collection rate', () => {
    render(<MainDashboard stats={baseStats} />);
    expect(screen.getByText('80.6%')).toBeInTheDocument();
  });

  it('displays the outstanding dues in INR format', () => {
    render(<MainDashboard stats={baseStats} />);
    expect(screen.getByText(/₹1,20,000/)).toBeInTheDocument();
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
    expect(val).toHaveStyle({ color: '#0B2B26' });
  });
});

describe('MainDashboard – finance snapshot', () => {
  it('renders Monthly Collections label', () => {
    render(<MainDashboard stats={baseStats} />);
    expect(screen.getByText(/monthly collections/i)).toBeInTheDocument();
  });

  it('renders Monthly Expenses label', () => {
    render(<MainDashboard stats={baseStats} />);
    expect(screen.getByText(/monthly expenses/i)).toBeInTheDocument();
  });

  it('formats collections correctly', () => {
    render(<MainDashboard stats={baseStats} />);
    // 500000 → ₹5,00,000 (Indian locale)
    expect(screen.getByText(/₹5,00,000/)).toBeInTheDocument();
  });

  it('formats expenses correctly', () => {
    render(<MainDashboard stats={baseStats} />);
    expect(screen.getByText(/₹3,20,000/)).toBeInTheDocument();
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

  it('shows fallback text when no next event is set', () => {
    const noEvent = { ...baseStats, nextEvent: null };
    render(<MainDashboard stats={noEvent} />);
    expect(screen.getByText('No upcoming events')).toBeInTheDocument();
  });

  it('shows HEALTHY utility status', () => {
    render(<MainDashboard stats={baseStats} />);
    expect(screen.getByText('HEALTHY')).toBeInTheDocument();
  });
});

describe('MainDashboard – Cheque Tracker quick-action', () => {
  it('dispatches a changeTab CustomEvent with detail "cheques" when clicked', () => {
    render(<MainDashboard stats={baseStats} />);
    const listener = vi.fn();
    window.addEventListener('changeTab', listener);

    fireEvent.click(screen.getByRole('button', { name: /cheque tracker/i }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toBe('cheques');

    window.removeEventListener('changeTab', listener);
  });
});
