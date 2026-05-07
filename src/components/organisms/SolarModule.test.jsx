import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SolarModule from './SolarModule';

// ── Stub heavy child components ──────────────────────────────────
vi.mock('./SolarOverview.jsx', () => ({
  default: ({ isAdmin }) => (
    <div data-testid="solar-overview">{isAdmin ? 'admin-overview' : 'overview'}</div>
  ),
}));
vi.mock('./SolarVendorTracker.jsx', () => ({
  default: ({ isAdmin }) => (
    <div data-testid="solar-tracker">{isAdmin ? 'admin-tracker' : 'tracker'}</div>
  ),
}));
vi.mock('./SolarVendorCompare.jsx', () => ({
  default: ({ isAdmin }) => (
    <div data-testid="solar-compare">{isAdmin ? 'admin-compare' : 'compare'}</div>
  ),
}));

describe('SolarModule – initial render', () => {
  it('renders the Overview tab button', () => {
    render(<SolarModule />);
    expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
  });

  it('renders the Evaluation Checklist tab button', () => {
    render(<SolarModule />);
    expect(screen.getByRole('button', { name: /evaluation checklist/i })).toBeInTheDocument();
  });

  it('renders the Comparison Matrix tab button', () => {
    render(<SolarModule />);
    expect(screen.getByRole('button', { name: /comparison matrix/i })).toBeInTheDocument();
  });

  it('shows SolarOverview by default (overview tab)', () => {
    render(<SolarModule />);
    expect(screen.getByTestId('solar-overview')).toBeInTheDocument();
  });

  it('does NOT render SolarVendorTracker on initial load', () => {
    render(<SolarModule />);
    expect(screen.queryByTestId('solar-tracker')).not.toBeInTheDocument();
  });

  it('does NOT render SolarVendorCompare on initial load', () => {
    render(<SolarModule />);
    expect(screen.queryByTestId('solar-compare')).not.toBeInTheDocument();
  });
});

describe('SolarModule – tab switching', () => {
  it('shows SolarVendorTracker when Evaluation Checklist tab is clicked', async () => {
    const user = userEvent.setup();
    render(<SolarModule />);
    await user.click(screen.getByRole('button', { name: /evaluation checklist/i }));
    expect(screen.getByTestId('solar-tracker')).toBeInTheDocument();
    expect(screen.queryByTestId('solar-overview')).not.toBeInTheDocument();
  });

  it('shows SolarVendorCompare when Comparison Matrix tab is clicked', async () => {
    const user = userEvent.setup();
    render(<SolarModule />);
    await user.click(screen.getByRole('button', { name: /comparison matrix/i }));
    expect(screen.getByTestId('solar-compare')).toBeInTheDocument();
    expect(screen.queryByTestId('solar-overview')).not.toBeInTheDocument();
  });

  it('navigates back to Overview from Tracker tab', async () => {
    const user = userEvent.setup();
    render(<SolarModule />);
    await user.click(screen.getByRole('button', { name: /evaluation checklist/i }));
    await user.click(screen.getByRole('button', { name: /overview/i }));
    expect(screen.getByTestId('solar-overview')).toBeInTheDocument();
    expect(screen.queryByTestId('solar-tracker')).not.toBeInTheDocument();
  });

  it('navigates from Compare to Tracker directly', async () => {
    const user = userEvent.setup();
    render(<SolarModule />);
    await user.click(screen.getByRole('button', { name: /comparison matrix/i }));
    await user.click(screen.getByRole('button', { name: /evaluation checklist/i }));
    expect(screen.getByTestId('solar-tracker')).toBeInTheDocument();
    expect(screen.queryByTestId('solar-compare')).not.toBeInTheDocument();
  });
});

describe('SolarModule – isAdmin prop', () => {
  it('passes isAdmin=true to SolarOverview', () => {
    render(<SolarModule isAdmin={true} />);
    expect(screen.getByText('admin-overview')).toBeInTheDocument();
  });

  it('defaults to isAdmin=false (read-only overview)', () => {
    render(<SolarModule />);
    expect(screen.getByText('overview')).toBeInTheDocument();
  });
});
