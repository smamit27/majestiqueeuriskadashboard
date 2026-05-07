import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SecurityModule from './SecurityModule';

// ── Stub heavy child components ──────────────────────────────────
vi.mock('./SecurityAttendanceManager.jsx', () => ({
  default: ({ isAdmin }) => (
    <div data-testid="security-attendance-manager">
      {isAdmin ? 'admin-guard' : 'readonly-guard'}
    </div>
  ),
}));
vi.mock('./SecurityBillCalculator.jsx', () => ({
  default: () => <div data-testid="security-bill-calculator">security-billing</div>,
}));
vi.mock('../molecules/SectionCard.jsx', () => ({
  default: ({ id, children }) => <section id={id}>{children}</section>,
}));

describe('SecurityModule – initial render', () => {
  it('renders the Guard Deployment tab button', () => {
    render(<SecurityModule />);
    expect(screen.getByRole('button', { name: /guard deployment/i })).toBeInTheDocument();
  });

  it('renders the Bill Calculator tab button', () => {
    render(<SecurityModule />);
    expect(screen.getByRole('button', { name: /bill calculator/i })).toBeInTheDocument();
  });

  it('shows SecurityAttendanceManager by default', () => {
    render(<SecurityModule />);
    expect(screen.getByTestId('security-attendance-manager')).toBeInTheDocument();
  });

  it('does NOT show SecurityBillCalculator on initial render', () => {
    render(<SecurityModule />);
    expect(screen.queryByTestId('security-bill-calculator')).not.toBeInTheDocument();
  });
});

describe('SecurityModule – tab switching', () => {
  it('shows SecurityBillCalculator when Bill Calculator tab is clicked', async () => {
    const user = userEvent.setup();
    render(<SecurityModule />);
    await user.click(screen.getByRole('button', { name: /bill calculator/i }));
    expect(screen.getByTestId('security-bill-calculator')).toBeInTheDocument();
  });

  it('hides AttendanceManager when switching to billing', async () => {
    const user = userEvent.setup();
    render(<SecurityModule />);
    await user.click(screen.getByRole('button', { name: /bill calculator/i }));
    expect(screen.queryByTestId('security-attendance-manager')).not.toBeInTheDocument();
  });

  it('switches back to Guard Deployment tab', async () => {
    const user = userEvent.setup();
    render(<SecurityModule />);
    await user.click(screen.getByRole('button', { name: /bill calculator/i }));
    await user.click(screen.getByRole('button', { name: /guard deployment/i }));
    expect(screen.getByTestId('security-attendance-manager')).toBeInTheDocument();
    expect(screen.queryByTestId('security-bill-calculator')).not.toBeInTheDocument();
  });
});

describe('SecurityModule – isAdmin prop', () => {
  it('passes isAdmin=true to AttendanceManager', () => {
    render(<SecurityModule isAdmin={true} />);
    expect(screen.getByText('admin-guard')).toBeInTheDocument();
  });

  it('defaults to isAdmin=false (readonly)', () => {
    render(<SecurityModule />);
    expect(screen.getByText('readonly-guard')).toBeInTheDocument();
  });
});
