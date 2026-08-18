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
});
