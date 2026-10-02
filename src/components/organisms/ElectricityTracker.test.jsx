import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ElectricityTracker, {
  calculateSubmeterRollover,
  calculateTataSubmeterBill,
  computeBillingDuration,
  DEFAULT_TATA_SEED
} from './ElectricityTracker';

// ── Mock Firebase ────────────────────────────────────────────────
vi.mock('../../firebase.js', () => ({
  db: {},
  isFirebaseConfigured: false,
  ensureFirebaseSession: vi.fn().mockResolvedValue(undefined),
}));

// ── Mock Recharts ────────────────────────────────────────────────
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
}));

// ── Mock XLSX ────────────────────────────────────────────────────
vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

import * as XLSX from 'xlsx';

describe('ElectricityTracker – Tata Electricity Bill view and calculations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Calculation Helpers: 10,000 Reset Rollover & Duration', () => {
    it('calculates standard consumption when curr >= prev', () => {
      // Nov 24 to Feb 25: 6996 to 9073 => 2077 units
      const result = calculateSubmeterRollover('6996', '9073');
      expect(result.units).toBe(2077);
      expect(result.isRollover).toBe(false);
      expect(result.formulaText).toBe('9073 - 6996 = 2077 units');
    });

    it('calculates rollover consumption when curr < prev (Reset after 10000)', () => {
      // Mar 25 to August 25: 9073 to 2568 => (10000 - 9073) + 2568 = 3495 units
      const result = calculateSubmeterRollover('9073', '2568');
      expect(result.units).toBe(3495);
      expect(result.isRollover).toBe(true);
      expect(result.formulaText).toContain('10,000');
      expect(result.formulaText).toContain('3495 units (Reset after 10000)');

      // Mar 23 to Jul 23: 7629 to 0177 => (10000 - 7629) + 177 = 2548 units
      const result2 = calculateSubmeterRollover('7629', '0177');
      expect(result2.units).toBe(2548);
      expect(result2.isRollover).toBe(true);
    });

    it('handles explicit units override for Sep 25 to 18th May 26', () => {
      const result = calculateSubmeterRollover('2568', '1557', 8988);
      expect(result.units).toBe(8988);
      expect(result.isRollover).toBe(true);
      expect(result.formulaText).toContain('8988 units');
    });

    it('calculates full Tata sub-meter bill with rate per unit and grand total', () => {
      // 8988 units @ 13 => 116844
      const bill = calculateTataSubmeterBill('2568', '1557', '13', 8988);
      expect(bill.consumption).toBe(8988);
      expect(bill.ratePerUnit).toBe(13);
      expect(bill.grandTotal).toBe(116844);

      // Feb 24 to May 24: 1747 units @ 12.50 => 21837.50
      const bill2 = calculateTataSubmeterBill('2607', '4354', '12.50');
      expect(bill2.consumption).toBe(1747);
      expect(bill2.ratePerUnit).toBe(12.5);
      expect(bill2.grandTotal).toBe(21837.5);
    });

    it('computes approximate duration in months and days', () => {
      const dur = computeBillingDuration('2025-03-01', '2025-08-31');
      expect(dur).toContain('Months');
      expect(dur).toContain('Days');
    });
  });

  describe('UI Component Rendering & Interaction', () => {
    it('renders Tata Electricity Sub-Meter Billing and Tata Electricity Bills heading by default', async () => {
      render(<ElectricityTracker isAdmin={true} />);
      await waitFor(() => {
        expect(screen.getByText(/tata electricity sub-meter billing/i)).toBeInTheDocument();
        expect(screen.getByText(/tata electricity bills/i)).toBeInTheDocument();
      });
    });

    it('renders Tata Electricity Bill tab as the active default tab', async () => {
      render(<ElectricityTracker isAdmin={true} />);
      await waitFor(() => {
        const tataTab = screen.getByRole('button', { name: /tata electricity bill/i });
        expect(tataTab).toBeInTheDocument();
        expect(tataTab).toHaveClass('active');
      });
    });

    it('renders 10,000 reset rollover principle banner', async () => {
      render(<ElectricityTracker isAdmin={true} />);
      await waitFor(() => {
        expect(screen.getByText(/4-digit sub-meter rollover principle \(reset after 10,000 units\)/i)).toBeInTheDocument();
      });
    });

    it('renders the 8 audited billing cycles and their durations', async () => {
      render(<ElectricityTracker isAdmin={true} />);
      await waitFor(() => {
        expect(screen.getByText(/Sep 25 to 18th May 26/i)).toBeInTheDocument();
        expect(screen.getByText(/Mar 25 to August 25/i)).toBeInTheDocument();
        expect(screen.getByText(/Nov 24 to Feb 25/i)).toBeInTheDocument();
        expect(screen.getByText(/Jun 24 to Oct 24/i)).toBeInTheDocument();
        expect(screen.getByText(/Feb 24 to May 24/i)).toBeInTheDocument();
        expect(screen.getByText(/Nov 23 to Jan 24/i)).toBeInTheDocument();
        expect(screen.getByText(/Aug 23 to Oct 23/i)).toBeInTheDocument();
        expect(screen.getByText(/Mar 23 to Jul 23/i)).toBeInTheDocument();
      });
    });

    it('renders Export to Excel and Export PDF Summary buttons', async () => {
      render(<ElectricityTracker isAdmin={true} />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export to excel/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /export pdf summary/i })).toBeInTheDocument();
      });
    });

    it('renders Create New Tata Electricity Bill form in admin mode', async () => {
      render(<ElectricityTracker isAdmin={true} />);
      await waitFor(() => {
        expect(screen.getByText(/create new tata electricity bill/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /calculate & create bill/i })).toBeInTheDocument();
      });
    });

    it('triggers window.open and writes invoice when print bill icon is clicked', async () => {
      const user = userEvent.setup();
      let writtenHtml = '';
      const mockPrintWindow = {
        document: {
          write: vi.fn((html) => { writtenHtml = html; }),
          close: vi.fn(),
        },
      };
      const openSpy = vi.spyOn(window, 'open').mockReturnValue(mockPrintWindow);

      render(<ElectricityTracker isAdmin={true} />);
      await waitFor(() => screen.getByText(/tata electricity bills/i));

      const printBtns = screen.getAllByTitle(/print \/ export bill invoice/i);
      expect(printBtns.length).toBeGreaterThan(0);

      await user.click(printBtns[0]);

      expect(openSpy).toHaveBeenCalledWith('', '_blank');
      expect(mockPrintWindow.document.write).toHaveBeenCalled();
      expect(writtenHtml).toContain('Tata Electricity Sub-Meter Tax Invoice / Bill');
      expect(writtenHtml).toContain('Majestique Euriska Co-Op Housing Society Ltd.');
      expect(writtenHtml).toContain('Tata Play Limited');
      expect(writtenHtml).toContain('window.print()');

      openSpy.mockRestore();
    });

    it('triggers window.open and writes summary report when Export PDF Summary is clicked', async () => {
      const user = userEvent.setup();
      let writtenHtml = '';
      const mockPrintWindow = {
        document: {
          write: vi.fn((html) => { writtenHtml = html; }),
          close: vi.fn(),
        },
      };
      const openSpy = vi.spyOn(window, 'open').mockReturnValue(mockPrintWindow);

      render(<ElectricityTracker isAdmin={true} />);
      await waitFor(() => screen.getByRole('button', { name: /export pdf summary/i }));

      await user.click(screen.getByRole('button', { name: /export pdf summary/i }));

      expect(openSpy).toHaveBeenCalledWith('', '_blank');
      expect(mockPrintWindow.document.write).toHaveBeenCalled();
      expect(writtenHtml).toContain('Tata Electricity Sub-Meter Consolidated Account Statement');
      expect(writtenHtml).toContain('window.print()');

      openSpy.mockRestore();
    });

    it('calls XLSX.writeFile with correct filename when Export to Excel is clicked', async () => {
      const user = userEvent.setup();
      render(<ElectricityTracker isAdmin={true} />);
      await waitFor(() => screen.getByRole('button', { name: /export to excel/i }));

      await user.click(screen.getByRole('button', { name: /export to excel/i }));

      expect(XLSX.writeFile).toHaveBeenCalledTimes(1);
      const fileName = XLSX.writeFile.mock.calls[0][1];
      expect(fileName).toBe('Tata_Electricity_Bills.xlsx');
    });
  });
});
