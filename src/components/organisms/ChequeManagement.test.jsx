import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChequeManagement from './ChequeManagement.jsx';

// Mock firebase
vi.mock('../../firebase.js', () => ({
  db: {},
  ensureFirebaseSession: vi.fn().mockResolvedValue(),
  isFirebaseConfigured: true
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({
      cheques: [
        {
          id: 101,
          srNo: 1,
          date: '2026-06-01',
          chequeNo: '493',
          vendor: 'CANCELLED',
          purpose: 'Cancel By Amit as month over',
          amount: '0',
          whoPaid: 'A Building',
          isPaid: false
        }
      ]
    })
  }),
  setDoc: vi.fn().mockResolvedValue(),
  serverTimestamp: vi.fn()
}));

describe('ChequeManagement Component - Automatic Past Month Lock System', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 29)); // 2026-09-29 (September 2026)
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('automatically locks all past months (Apr-26 to Aug-26) when current month is September 2026', async () => {
    render(<ChequeManagement isAdmin={true} />);

    const aprTab = screen.getByRole('button', { name: /Apr 26/i });
    const mayTab = screen.getByRole('button', { name: /May 26/i });
    const junTab = screen.getByRole('button', { name: /Jun 26/i });
    const julTab = screen.getByRole('button', { name: /Jul 26/i });
    const augTab = screen.getByRole('button', { name: /Aug 26/i });
    const sepTab = screen.getByRole('button', { name: /Sept? 26/i });
    const octTab = screen.getByRole('button', { name: /Oct 26/i });

    expect(aprTab.textContent).toContain('🔒');
    expect(mayTab.textContent).toContain('🔒');
    expect(junTab.textContent).toContain('🔒');
    expect(julTab.textContent).toContain('🔒');
    expect(augTab.textContent).toContain('🔒');
    expect(sepTab.textContent).not.toContain('🔒');
    expect(octTab.textContent).not.toContain('🔒');
  });

  it('shows locked banner and disabled form when viewing a closed past month (e.g. June 2026)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ChequeManagement isAdmin={true} />);

    const junTab = screen.getByRole('button', { name: /Jun 26/i });
    await user.click(junTab);

    expect(screen.getByText(/Closed Month Locked: June 2026/i)).toBeInTheDocument();
    expect(screen.getByText('🔒 CLOSED MONTH LOCKED')).toBeInTheDocument();
    expect(screen.getByText(/Adding Cheques Disabled for June 2026/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unlock with Password/i })).toBeInTheDocument();
  });

  it('automatically locks September 2026 when next month (October 2026) starts', async () => {
    // Advance time to October 1, 2026
    vi.setSystemTime(new Date(2026, 9, 1)); // 2026-10-01 (October 2026)

    render(<ChequeManagement isAdmin={true} />);

    const sepTab = screen.getByRole('button', { name: /Sept? 26/i });
    const octTab = screen.getByRole('button', { name: /Oct 26/i });

    // September is now past, so it's locked!
    expect(sepTab.textContent).toContain('🔒');
    // October is current, so it's unlocked/open!
    expect(octTab.textContent).not.toContain('🔒');
  });

  it('handles wrong password and unlocks past month when $05CeLRO is entered', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ChequeManagement isAdmin={true} />);

    // Select June 2026
    const junTab = screen.getByRole('button', { name: /Jun 26/i });
    await user.click(junTab);

    // Click Unlock with Password
    const unlockBtn = screen.getByRole('button', { name: /Unlock with Password/i });
    await user.click(unlockBtn);

    // Modal is shown
    expect(screen.getByRole('heading', { name: /Unlock Cheque Tracker — June 2026/i })).toBeInTheDocument();
    const pwdInput = screen.getByLabelText(/Authorization Password/i);
    const submitBtn = screen.getByRole('button', { name: /Unlock Editing/i });

    // Test wrong password
    await user.type(pwdInput, 'invalid');
    await user.click(submitBtn);
    expect(screen.getByText(/Incorrect authorization password/i)).toBeInTheDocument();

    // Test correct password
    await user.clear(pwdInput);
    await user.type(pwdInput, '$05CeLRO');
    await user.click(submitBtn);

    // Modal closes and unlocked banner appears
    expect(screen.queryByRole('heading', { name: /Unlock Cheque Tracker — June 2026/i })).not.toBeInTheDocument();
    expect(screen.getByText(/June 2026 Unlocked/i)).toBeInTheDocument();
    expect(screen.getByText(/AUDIT UNLOCKED/i)).toBeInTheDocument();

    // Add form is now visible
    expect(screen.getByRole('button', { name: /Add to Ledger/i })).toBeInTheDocument();

    // Re-lock Month
    const relockBtn = screen.getByRole('button', { name: /Re-lock Month/i });
    await user.click(relockBtn);
    expect(screen.getByText(/Closed Month Locked: June 2026/i)).toBeInTheDocument();
  });
});
