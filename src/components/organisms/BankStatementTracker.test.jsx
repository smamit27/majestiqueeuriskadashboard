import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BankStatementTracker from './BankStatementTracker.jsx';

// Mock Recharts since it uses ResizeObserver and SVG rendering which JSDOM doesn't support well
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  };
});

// Mock Firebase dependency inside FixedDepositTracker component
vi.mock('../../firebase.js', () => ({
  db: {},
  isFirebaseConfigured: false
}));

vi.mock('../../hooks/useCollection.js', () => ({
  useCollection: vi.fn().mockReturnValue({
    items: [],
    loading: false,
    source: 'mock',
    error: ''
  })
}));

describe('BankStatementTracker - Ledger Entries Sorting', () => {
  it('allows sorting full ledger entries by newest date, oldest date, and amount', async () => {
    const user = userEvent.setup();

    render(<BankStatementTracker isAdmin={false} />);

    // Unlock workspace
    await user.type(screen.getByPlaceholderText('Enter password...'), '$05CeLRO');
    await user.click(screen.getByRole('button', { name: /Unlock Auditor Workspace/i }));

    // Click Transactions Log Sub-tab
    const logTab = await screen.findByRole('button', { name: /Transactions Log/i });
    await user.click(logTab);

    // Verify select sort dropdown is present
    const sortSelect = screen.getByRole('combobox');
    expect(sortSelect).toBeInTheDocument();
    
    // Default should be DATE_DESC (Newest First)
    expect(sortSelect.value).toBe('DATE_DESC');

    // Helper to get all rendered dates from the table
    const getRenderedDates = () => {
      const rows = document.querySelectorAll('.task-table tbody tr');
      return Array.from(rows).map(row => {
        const firstCell = row.querySelector('td');
        return firstCell ? firstCell.textContent : '';
      }).filter(Boolean);
    };

    // Helper to get all rendered amounts from the table
    const getRenderedAmounts = () => {
      const rows = document.querySelectorAll('.task-table tbody tr');
      return Array.from(rows).map(row => {
        const cells = row.querySelectorAll('td');
        const drText = cells[3] ? cells[3].textContent.replace(/[^\d.]/g, '') : '';
        const crText = cells[4] ? cells[4].textContent.replace(/[^\d.]/g, '') : '';
        return parseFloat(drText || crText || '0');
      });
    };

    // 1. Verify default newest first sorting
    const datesDefault = getRenderedDates();
    expect(datesDefault.length).toBeGreaterThan(0);
    // Parse helper
    const toTime = (d) => {
      const p = d.split('/');
      return new Date(2000 + parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0])).getTime();
    };
    for (let i = 0; i < datesDefault.length - 1; i++) {
      expect(toTime(datesDefault[i])).toBeGreaterThanOrEqual(toTime(datesDefault[i + 1]));
    }

    // 2. Select DATE_ASC (Oldest First)
    await user.selectOptions(sortSelect, 'DATE_ASC');
    expect(sortSelect.value).toBe('DATE_ASC');
    const datesAsc = getRenderedDates();
    for (let i = 0; i < datesAsc.length - 1; i++) {
      expect(toTime(datesAsc[i])).toBeLessThanOrEqual(toTime(datesAsc[i + 1]));
    }

    // 3. Select DESC (High Amount -> Low)
    await user.selectOptions(sortSelect, 'DESC');
    expect(sortSelect.value).toBe('DESC');
    const amountsDesc = getRenderedAmounts();
    for (let i = 0; i < amountsDesc.length - 1; i++) {
      expect(amountsDesc[i]).toBeGreaterThanOrEqual(amountsDesc[i + 1]);
    }

    // 4. Select ASC (Low Amount -> High)
    await user.selectOptions(sortSelect, 'ASC');
    expect(sortSelect.value).toBe('ASC');
    const amountsAsc = getRenderedAmounts();
    for (let i = 0; i < amountsAsc.length - 1; i++) {
      expect(amountsAsc[i]).toBeLessThanOrEqual(amountsAsc[i + 1]);
    }
  });

  it('renders August 2026 statement period and verified metrics correctly', async () => {
    const user = userEvent.setup();

    render(<BankStatementTracker isAdmin={false} />);

    // Unlock workspace
    await user.type(screen.getByPlaceholderText('Enter password...'), '$05CeLRO');
    await user.click(screen.getByRole('button', { name: /Unlock Auditor Workspace/i }));

    // Click August 2026 Month button
    const augustBtn = await screen.findByRole('button', { name: /August 2026/i });
    expect(augustBtn).toBeInTheDocument();
    await user.click(augustBtn);

    // Verify August 2026 summary metrics
    const periodElements = screen.getAllByText(/August 3, 2026 - August 29, 2026/i);
    expect(periodElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/₹4,24,339.27/i)).toBeInTheDocument(); // Opening balance
    expect(screen.getByText(/₹4,62,925.87/i)).toBeInTheDocument(); // Closing balance
    expect(screen.getByText(/₹2,48,629.60/i)).toBeInTheDocument(); // Total Credits
    expect(screen.getByText(/₹2,10,043.00/i)).toBeInTheDocument(); // Total Debits
  });

  it('provides 5-Month Financial Trend Comparison PDF print buttons and generates report', async () => {
    const user = userEvent.setup();

    // Mock window.open
    const mockDocumentWrite = vi.fn();
    const mockDocumentClose = vi.fn();
    const mockPrint = vi.fn();
    const mockWindowOpen = vi.fn().mockReturnValue({
      document: {
        write: mockDocumentWrite,
        close: mockDocumentClose
      },
      print: mockPrint
    });
    vi.stubGlobal('open', mockWindowOpen);

    render(<BankStatementTracker isAdmin={false} />);

    // Unlock workspace
    await user.type(screen.getByPlaceholderText('Enter password...'), '$05CeLRO');
    await user.click(screen.getByRole('button', { name: /Unlock Auditor Workspace/i }));

    // 1. Check header button in 5-Month Trend Comparison bar
    const printHeaderBtn = await screen.findByRole('button', { name: /Print 5-Month Trend \(PDF\)/i });
    expect(printHeaderBtn).toBeInTheDocument();

    // Click header print button
    await user.click(printHeaderBtn);
    expect(mockWindowOpen).toHaveBeenCalledWith('', '_blank');
    expect(mockDocumentWrite).toHaveBeenCalled();
    const writtenHtml = mockDocumentWrite.mock.calls[0][0];
    expect(writtenHtml).toContain('5-Month Financial Trend Comparison & Profit/Loss Report');
    expect(writtenHtml).toContain('April 2026');
    expect(writtenHtml).toContain('May 2026');
    expect(writtenHtml).toContain('June 2026');
    expect(writtenHtml).toContain('July 2026');
    expect(writtenHtml).toContain('August 2026');
    expect(writtenHtml).toContain('3,13,837.14'); // Cumulative net profit
    expect(writtenHtml).toContain('4,62,925.87'); // Final closing balance

    // 2. Switch to Reports tab and verify dedicated card
    const reportsTab = await screen.findByRole('button', { name: /Reports & Print/i });
    await user.click(reportsTab);

    const reportCardPrintBtn = await screen.findByRole('button', { name: /Print 5-Month Trend Report \(PDF\)/i });
    expect(reportCardPrintBtn).toBeInTheDocument();

    // Click report tab print button
    await user.click(reportCardPrintBtn);
    expect(mockWindowOpen).toHaveBeenCalledTimes(2);

    vi.unstubAllGlobals();
  });
});

