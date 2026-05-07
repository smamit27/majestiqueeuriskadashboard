import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FinanceTracker from './FinanceTracker';

// ── Mock Firebase (Firestore + auth helpers) ─────────────────────
vi.mock('../../firebase.js', () => ({
  db: {},
  isFirebaseConfigured: false,        // disable all real Firestore calls
  ensureFirebaseSession: vi.fn().mockResolvedValue(undefined),
}));

// Stub xlsx so XLSX.writeFile doesn't try to open a file download
vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

import * as XLSX from 'xlsx';

describe('FinanceTracker – initial render', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the Monthly Cashflow Tracker heading', async () => {
    render(<FinanceTracker />);
    await waitFor(() =>
      expect(screen.getByText(/monthly cashflow tracker/i)).toBeInTheDocument()
    );
  });

  it('renders Income Details section', async () => {
    render(<FinanceTracker />);
    await waitFor(() =>
      expect(screen.getByText(/income details/i)).toBeInTheDocument()
    );
  });

  it('renders Expense Details section', async () => {
    render(<FinanceTracker />);
    await waitFor(() =>
      expect(screen.getByText(/expense details/i)).toBeInTheDocument()
    );
  });

  it('renders Total Income summary card', async () => {
    render(<FinanceTracker />);
    await waitFor(() =>
      expect(screen.getByText('Total Income')).toBeInTheDocument()
    );
  });

  it('renders Total Expenses summary card', async () => {
    render(<FinanceTracker />);
    await waitFor(() =>
      expect(screen.getByText('Total Expenses')).toBeInTheDocument()
    );
  });

  it('renders Closing Balance summary card', async () => {
    render(<FinanceTracker />);
    await waitFor(() =>
      expect(screen.getByText('Closing Balance')).toBeInTheDocument()
    );
  });

  it('renders the Export Excel button for all users', async () => {
    render(<FinanceTracker />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /export excel/i })).toBeInTheDocument()
    );
  });

  it('does NOT show Save Tracker button for non-admin', async () => {
    render(<FinanceTracker isAdmin={false} />);
    await waitFor(() => screen.getByText(/monthly cashflow tracker/i));
    expect(screen.queryByRole('button', { name: /save tracker/i })).not.toBeInTheDocument();
  });

  it('shows Save Tracker button when isAdmin=true', async () => {
    render(<FinanceTracker isAdmin={true} />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /save tracker/i })).toBeInTheDocument()
    );
  });
});

describe('FinanceTracker – month tab navigation', () => {
  it('renders 12 month tab buttons', async () => {
    render(<FinanceTracker />);
    await waitFor(() => screen.getByText(/monthly cashflow tracker/i));
    // There are 12 months in the financial year
    const tablist = screen.getAllByRole('button');
    // At least 12 month tabs (Apr–Mar) should be present
    const monthTabs = tablist.filter(b => /^(apr|may|jun|jul|aug|sep|oct|nov|dec|jan|feb|mar)/i.test(b.textContent ?? ''));
    expect(monthTabs.length).toBeGreaterThanOrEqual(12);
  });
});

describe('FinanceTracker – admin row management', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows + Add Row buttons in admin mode', async () => {
    render(<FinanceTracker isAdmin={true} />);
    await waitFor(() => screen.getByText(/income details/i));
    const addBtns = screen.getAllByRole('button', { name: /\+ add row/i });
    expect(addBtns.length).toBe(2); // one income, one expense
  });

  it('does NOT show + Add Row buttons for non-admin', async () => {
    render(<FinanceTracker isAdmin={false} />);
    await waitFor(() => screen.getByText(/income details/i));
    expect(screen.queryByRole('button', { name: /\+ add row/i })).not.toBeInTheDocument();
  });

  it('adds a new income row when + Add Row (income) is clicked', async () => {
    const user = userEvent.setup();
    render(<FinanceTracker isAdmin={true} />);
    await waitFor(() => screen.getByText(/income details/i));

    const incomeInputsBefore = screen.getAllByPlaceholderText(/maintenance/i).length;
    const [incomeAddBtn] = screen.getAllByRole('button', { name: /\+ add row/i });
    await user.click(incomeAddBtn);

    const incomeInputsAfter = screen.getAllByPlaceholderText(/maintenance/i).length;
    expect(incomeInputsAfter).toBe(incomeInputsBefore + 1);
  });
});

describe('FinanceTracker – calculations', () => {
  it('shows ₹0.00 for all totals when no values are entered', async () => {
    render(<FinanceTracker />);
    await waitFor(() => screen.getByText('Total Income'));
    const zeros = screen.getAllByText('₹0.00');
    // At minimum: Total Income, Total Expenses, Closing Balance + Final Balance
    expect(zeros.length).toBeGreaterThanOrEqual(3);
  });
});

describe('FinanceTracker – Excel export', () => {
  it('calls XLSX.writeFile when Export Excel is clicked', async () => {
    const user = userEvent.setup();
    render(<FinanceTracker />);
    await waitFor(() => screen.getByRole('button', { name: /export excel/i }));
    await user.click(screen.getByRole('button', { name: /export excel/i }));
    expect(XLSX.writeFile).toHaveBeenCalledTimes(1);
  });

  it('uses the correct filename format for export', async () => {
    const user = userEvent.setup();
    render(<FinanceTracker />);
    await waitFor(() => screen.getByRole('button', { name: /export excel/i }));
    await user.click(screen.getByRole('button', { name: /export excel/i }));
    const filename = XLSX.writeFile.mock.calls[0][1];
    expect(filename).toMatch(/Finance_Tracker_\d{4}-\d{2}\.xlsx/);
  });
});
