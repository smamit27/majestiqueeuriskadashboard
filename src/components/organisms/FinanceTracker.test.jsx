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
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });

  it('shows Save Tracker button when isAdmin=true', async () => {
    render(<FinanceTracker isAdmin={true} />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
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

describe('FinanceTracker – locked months (April and May 2026)', () => {
  it('disables editing, hides Add Row, hides Save button, and sets inputs to readOnly for April 2026', async () => {
    const user = userEvent.setup();
    render(<FinanceTracker isAdmin={true} />);
    await waitFor(() => screen.getByText(/income details/i));

    // Find and click the Apr 26 tab
    const tablist = screen.getAllByRole('button');
    const aprTab = tablist.find(b => /apr/i.test(b.textContent ?? ''));
    expect(aprTab).toBeDefined();
    await user.click(aprTab);

    // Verify warning banner is present
    expect(screen.getByText(/this month is locked/i)).toBeInTheDocument();

    // Verify Save button is hidden/not in document
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();

    // Verify Add Row buttons are not in document
    expect(screen.queryByRole('button', { name: /\+ add row/i })).not.toBeInTheDocument();

    // Verify inputs are readOnly
    const inputs = screen.getAllByRole('textbox');
    for (const input of inputs) {
      expect(input).toHaveAttribute('readOnly');
    }
  });

  it('disables editing, hides Add Row, hides Save button, and sets inputs to readOnly for May 2026', async () => {
    const user = userEvent.setup();
    render(<FinanceTracker isAdmin={true} />);
    await waitFor(() => screen.getByText(/income details/i));

    // Find and click the May 26 tab
    const tablist = screen.getAllByRole('button');
    const mayTab = tablist.find(b => /may/i.test(b.textContent ?? ''));
    expect(mayTab).toBeDefined();
    await user.click(mayTab);

    // Verify warning banner is present
    expect(screen.getByText(/this month is locked/i)).toBeInTheDocument();

    // Verify Save button is hidden/not in document
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();

    // Verify Add Row buttons are not in document
    expect(screen.queryByRole('button', { name: /\+ add row/i })).not.toBeInTheDocument();

    // Verify inputs are readOnly
    const inputs = screen.getAllByRole('textbox');
    for (const input of inputs) {
      expect(input).toHaveAttribute('readOnly');
    }
  });

  it('updates month tabs when switching the Financial Year selector', async () => {
    const user = userEvent.setup();
    render(<FinanceTracker />);
    await waitFor(() => screen.getByText(/income details/i));

    // Select FY 2025-26 from dropdown
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, '2025');

    // Headers/tabs should update
    expect(screen.getByText(/Income & Expenses — April 2025/i)).toBeInTheDocument();
  });
});
