import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
    expect(screen.getByRole('button', { name: /Add to (Building A|Ledger)/i })).toBeInTheDocument();

    // Re-lock Month
    const relockBtn = screen.getByRole('button', { name: /Re-lock Month/i });
    await user.click(relockBtn);
    expect(screen.getByText(/Closed Month Locked: June 2026/i)).toBeInTheDocument();
  });
});

describe('ChequeManagement Component - B and C Payback Tracking for Common Work', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 20)); // 2026-09-20 (September 2026)
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders B and C Paid Back Date columns and recovery tracking for Common Work in September 2026', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ChequeManagement isAdmin={true} />);

    const tables = screen.getAllByRole('table');
    const commonTable = tables[1];

    // In single-screen mode, Common Work section is rendered directly
    expect(within(commonTable).getByRole('columnheader', { name: /B Paid Back Date/i })).toBeInTheDocument();
    expect(within(commonTable).getByRole('columnheader', { name: /C Paid Back Date/i })).toBeInTheDocument();
    expect(within(commonTable).getByRole('columnheader', { name: /^Remark$/i })).toBeInTheDocument();

    // Summary banner/card should display payback tracking
    expect(screen.getByText(/B & C Payback Tracking Active/i)).toBeInTheDocument();
    expect(screen.getByText(/Inter-Building Recovery/i)).toBeInTheDocument();

    // Switch form to Common Work to see payback input fields
    const commonFormBtn = screen.getByRole('button', { name: /Common Work/i });
    await user.click(commonFormBtn);

    expect(screen.getByText('B Paid Back Date', { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByText('C Paid Back Date', { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByText('Remark / Notes', { selector: 'label' })).toBeInTheDocument();
  });

  it('renders B and C Paid Back Date columns and recovery tracking for Common Work in August 2026', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ChequeManagement isAdmin={true} />);

    // Switch to August 2026
    const augTab = screen.getByRole('button', { name: /Aug 26/i });
    await user.click(augTab);

    const tables = screen.getAllByRole('table');
    const commonTable = tables[1];

    // In August 2026, payback tracking IS active in Common Work section
    expect(within(commonTable).getByRole('columnheader', { name: /B Paid Back Date/i })).toBeInTheDocument();
    expect(within(commonTable).getByRole('columnheader', { name: /C Paid Back Date/i })).toBeInTheDocument();
    expect(within(commonTable).getByRole('columnheader', { name: /^Remark$/i })).toBeInTheDocument();
    expect(screen.getByText(/B & C Payback Tracking Active/i)).toBeInTheDocument();
  });

  it('does NOT render B or C Paid Back Date columns for Common Work in past months prior to August 2026', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ChequeManagement isAdmin={true} />);

    // Switch to July 2026 (prior to August 2026)
    const julTab = screen.getByRole('button', { name: /Jul 26/i });
    await user.click(julTab);

    // Headers should NOT include B or C Paid Back Date
    expect(screen.queryByRole('columnheader', { name: /B Paid Back Date/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /C Paid Back Date/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/B & C Payback Tracking Active/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Inter-Building Recovery/i)).not.toBeInTheDocument();
  });

  it('does NOT render B or C Paid Back Date columns in Building A table', async () => {
    render(<ChequeManagement isAdmin={true} />);

    const tables = screen.getAllByRole('table');
    const buildingATable = tables[0];
    expect(within(buildingATable).queryByRole('columnheader', { name: /B Paid Back Date/i })).not.toBeInTheDocument();
    expect(within(buildingATable).queryByRole('columnheader', { name: /C Paid Back Date/i })).not.toBeInTheDocument();
  });

  it('exports Building A and Common Work cheques together with both dates in the PDF', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let writtenDoc = '';
    const printWindow = {
      document: {
        write: vi.fn((html) => { writtenDoc = html; }),
        close: vi.fn(),
      },
    };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(printWindow);

    render(<ChequeManagement isAdmin={true} />);
    await user.click(screen.getByRole('button', { name: /Jun 26/i }));
    await user.click(screen.getByRole('button', { name: /export pdf/i }));

    expect(openSpy).toHaveBeenCalledWith('', '_blank');
    expect(writtenDoc).toContain('Combined Cheque Register');
    expect(writtenDoc).toContain('A Building and Common Work');
    expect(writtenDoc).toContain('A Building');
    expect(writtenDoc).toContain('Common Work');
    expect(writtenDoc).toContain('Cheque Date');
    expect(writtenDoc).toContain('Amount Deducted Date');
    expect(writtenDoc).toContain('MESDCL');
    expect(writtenDoc).toContain('2026-06-15');
    expect(writtenDoc).toContain('Tanaji Hunde');
    expect(writtenDoc).toContain('2026-06-12');
    expect(writtenDoc).toContain('window.print()');
    openSpy.mockRestore();
  });

  it('retains cheques 537, 540, and 542 in Building A and does not duplicate them in Common Work in September 2026', async () => {
    render(<ChequeManagement isAdmin={true} />);

    // Wait for async load
    const inputsA = await screen.findAllByDisplayValue(/537|540|542/);
    expect(inputsA.length).toBeGreaterThanOrEqual(3);

    const tables = screen.getAllByRole('table');
    const commonTable = tables[1];

    // In Common Work, 537, 540, 542 are not present
    expect(commonTable.textContent).not.toContain('537');
    expect(commonTable.textContent).not.toContain('540');
    expect(commonTable.textContent).not.toContain('542');
  });

  it('renders Edit button for existing cheques and opens Edit Cheque Modal', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ChequeManagement isAdmin={true} />);

    // Look for Edit buttons in the table
    const editButtons = await screen.findAllByRole('button', { name: /✏️ Edit/i });
    expect(editButtons.length).toBeGreaterThan(0);

    // Click the first Edit button
    await user.click(editButtons[0]);

    // Modal dialog should open
    expect(screen.getByRole('dialog', { name: /Edit Cheque/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Additional remark / note for this cheque...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
  });
});


