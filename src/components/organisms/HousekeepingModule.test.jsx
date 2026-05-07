import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HousekeepingModule from './HousekeepingModule';

// ── Stub heavy child components ──────────────────────────────────
vi.mock('./HousekeepingAttendanceManager.jsx', () => ({
  default: ({ isAdmin }) => (
    <div data-testid="hk-attendance-manager">
      {isAdmin ? 'admin-attendance' : 'readonly-attendance'}
    </div>
  ),
}));
vi.mock('./HousekeepingBillCalculator.jsx', () => ({
  default: () => <div data-testid="hk-bill-calculator">bill-calculator</div>,
}));
vi.mock('../molecules/SectionCard.jsx', () => ({
  default: ({ id, badge, title, children }) => (
    <section id={id}>
      <p>{badge}</p>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

const defaultProps = {
  isAdmin: false,
  staffMembers: [],
  staffPresentCount: 4,
  totalStaffCount: 6,
};

describe('HousekeepingModule – initial render', () => {
  it('renders the Attendance Tracking tab button', () => {
    render(<HousekeepingModule {...defaultProps} />);
    expect(screen.getByRole('button', { name: /attendance tracking/i })).toBeInTheDocument();
  });

  it('renders the Bill Calculator tab button', () => {
    render(<HousekeepingModule {...defaultProps} />);
    expect(screen.getByRole('button', { name: /bill calculator/i })).toBeInTheDocument();
  });

  it('shows the staff count in the Attendance tab label', () => {
    render(<HousekeepingModule {...defaultProps} staffPresentCount={4} totalStaffCount={6} />);
    expect(screen.getByText(/4\/6/)).toBeInTheDocument();
  });

  it('shows the AttendanceManager by default (tracking tab active)', () => {
    render(<HousekeepingModule {...defaultProps} />);
    expect(screen.getByTestId('hk-attendance-manager')).toBeInTheDocument();
  });

  it('does NOT show BillCalculator on initial render', () => {
    render(<HousekeepingModule {...defaultProps} />);
    expect(screen.queryByTestId('hk-bill-calculator')).not.toBeInTheDocument();
  });
});

describe('HousekeepingModule – tab switching', () => {
  it('shows BillCalculator when Bill Calculator tab is clicked', async () => {
    const user = userEvent.setup();
    render(<HousekeepingModule {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /bill calculator/i }));
    expect(screen.getByTestId('hk-bill-calculator')).toBeInTheDocument();
  });

  it('hides AttendanceManager when switching to billing tab', async () => {
    const user = userEvent.setup();
    render(<HousekeepingModule {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /bill calculator/i }));
    expect(screen.queryByTestId('hk-attendance-manager')).not.toBeInTheDocument();
  });

  it('switches back to tracking tab when Attendance tab is clicked again', async () => {
    const user = userEvent.setup();
    render(<HousekeepingModule {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /bill calculator/i }));
    await user.click(screen.getByRole('button', { name: /attendance tracking/i }));
    expect(screen.getByTestId('hk-attendance-manager')).toBeInTheDocument();
    expect(screen.queryByTestId('hk-bill-calculator')).not.toBeInTheDocument();
  });
});

describe('HousekeepingModule – isAdmin prop', () => {
  it('passes isAdmin=true down to AttendanceManager', () => {
    render(<HousekeepingModule {...defaultProps} isAdmin={true} />);
    expect(screen.getByText('admin-attendance')).toBeInTheDocument();
  });

  it('passes isAdmin=false (readonly) when not admin', () => {
    render(<HousekeepingModule {...defaultProps} isAdmin={false} />);
    expect(screen.getByText('readonly-attendance')).toBeInTheDocument();
  });
});
