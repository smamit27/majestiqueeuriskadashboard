import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FixedDepositTracker from './FixedDepositTracker.jsx';

vi.mock('../../firebase.js', () => ({
  db: {},
  isFirebaseConfigured: false
}));

vi.mock('../../hooks/useCollection.js', () => ({
  useCollection: vi.fn()
}));

import { useCollection } from '../../hooks/useCollection.js';

const mockSummaryDeposits = [
  {
    id: 'FD-ACT-01',
    fdNumber: 'FD-ACT-01',
    bankName: 'HDFC Bank',
    depositLine1: 'MAJESTIQUE EURISKA A BLDG',
    depositLine2: 'GENERAL FUND',
    principal: 100000,
    interestRate: 6.6,
    maturityValue: 110000,
    startDate: '2026-01-01',
    maturityDate: '2027-01-01',
    status: 'Active'
  },
  {
    id: 'FD-ACT-02',
    fdNumber: 'FD-ACT-02',
    bankName: 'ICICI Bank',
    depositLine1: 'ICICI FIXED DEPOSIT',
    principal: 200000,
    interestRate: 7.25,
    maturityValue: 220000,
    startDate: '2026-02-01',
    maturityDate: '2027-02-01',
    status: 'Active'
  },
  {
    id: 'FD-HIST-01',
    fdNumber: 'FD-HIST-01',
    bankName: 'HDFC Bank',
    depositLine1: 'MATURED DEPOSIT',
    principal: 999999,
    interestRate: 6.2,
    maturityValue: 1099999,
    startDate: '2024-01-01',
    maturityDate: '2025-01-01',
    status: 'Matured'
  }
];

describe('FixedDepositTracker summary poster', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCollection.mockReturnValue({
      items: mockSummaryDeposits,
      loading: false,
      source: 'mock',
      error: ''
    });
  });

  it('opens on the summary poster after a successful unlock', async () => {
    const user = userEvent.setup();

    render(<FixedDepositTracker isAdmin={false} />);

    await user.type(screen.getByLabelText(/authorization password/i), '$05CeLRO');
    await user.click(screen.getByRole('button', { name: /unlock fd workspace/i }));

    expect(await screen.findByRole('heading', { name: /fixed deposit summary - hdfc & icici bank/i })).toBeInTheDocument();
    expect(screen.getByText(/total expected interest/i)).toBeInTheDocument();
  });

  it('shows only active deposits inside the summary poster', async () => {
    const user = userEvent.setup();

    render(<FixedDepositTracker isAdmin={false} />);

    await user.type(screen.getByLabelText(/authorization password/i), '$05CeLRO');
    await user.click(screen.getByRole('button', { name: /unlock fd workspace/i }));

    expect(await screen.findByText(/grand total/i)).toBeInTheDocument();
    expect(screen.queryByText('FD-HIST-01')).not.toBeInTheDocument();
    expect(screen.getByText('3,00,000.00')).toBeInTheDocument();
    expect(screen.getByText('₹30,000.00')).toBeInTheDocument();
  });
});
