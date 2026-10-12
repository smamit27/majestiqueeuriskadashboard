import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ElectricityTracker, {
  calculateSubmeterRollover,
  calculateTataSubmeterBill,
  computeBillingDuration,
  computeMonthlyConsumption,
  DEFAULT_TATA_SEED,
  DEFAULT_BUILDING_A_SEED
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
  LineChart: ({ children }) => <div>{children}</div>,
  Bar: () => <div />,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
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

    it('renders Export to Excel and Statement PDF buttons', async () => {
      render(<ElectricityTracker isAdmin={true} />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export to excel/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /statement pdf/i })).toBeInTheDocument();
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

      const printBtns = screen.getAllByTitle(/quick print a4 pdf/i);
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

    it('triggers window.open and writes summary report when Statement PDF is clicked', async () => {
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
      await waitFor(() => screen.getByRole('button', { name: /statement pdf/i }));

      await user.click(screen.getByRole('button', { name: /statement pdf/i }));

      expect(openSpy).toHaveBeenCalledWith('', '_blank');
      expect(mockPrintWindow.document.write).toHaveBeenCalled();
      expect(writtenHtml).toContain('Tata Electricity Sub-Meter Consolidated Account Statement');
      expect(writtenHtml).toContain('AVG RATE / UNIT');
      expect(writtenHtml).toContain('Overall Avg Rate');
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

    it('opens Tata invoice generator modal with editable fields and live preview', async () => {
      const user = userEvent.setup();
      render(<ElectricityTracker isAdmin={true} />);
      await waitFor(() => screen.getByText(/tata electricity bills/i));

      // Open modal via table row action button
      const invoiceBtns = screen.getAllByTitle(/generate \/ preview tax invoice/i);
      expect(invoiceBtns.length).toBeGreaterThan(0);
      await user.click(invoiceBtns[0]);

      // Check modal heading and fields requested by user
      expect(screen.getByText(/tata electricity sub-meter tax invoice generator/i)).toBeInTheDocument();
      expect(screen.getByText(/electricity charges for the month:/i)).toBeInTheDocument();
      expect(screen.getAllByText(/society name →/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/previous reading\(a\):/i)).toBeInTheDocument();
      expect(screen.getByText(/current reading\(b\):/i)).toBeInTheDocument();
      expect(screen.getByText(/total consumption\(b-a\):/i)).toBeInTheDocument();
      expect(screen.getAllByText(/per unit charges →/i).length).toBeGreaterThanOrEqual(1);

      // Check live preview replica
      expect(screen.getByText(/live preview: official scanned invoice replica/i)).toBeInTheDocument();
      expect(screen.getAllByText(/majestique euriska a building cooperative housing society ltd/i).length).toBeGreaterThan(0);
      expect(screen.queryByText(/stamp and signature/i)).not.toBeInTheDocument();
    });

    it('modifies input fields in Tata invoice modal and prints official replica document', async () => {
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

      const invoiceBtns = screen.getAllByTitle(/generate \/ preview tax invoice/i);
      await user.click(invoiceBtns[0]);

      // Modify Month Range input
      const monthInput = screen.getByPlaceholderText(/e\.g\. sep 25 to may 26/i);
      await user.clear(monthInput);
      await user.type(monthInput, 'Sep 25 to May 26 Custom');

      // Click Print / Download PDF
      const printBtn = screen.getByRole('button', { name: /print \/ download pdf/i });
      await user.click(printBtn);

      expect(openSpy).toHaveBeenCalledWith('', '_blank');
      expect(mockPrintWindow.document.write).toHaveBeenCalled();
      expect(writtenHtml).toContain('Sep 25 to May 26 Custom');
      expect(writtenHtml).toContain('MAJESTIQUE EURISKA A BUILDING COOPERATIVE HOUSING SOCIETY LTD');
      expect(writtenHtml).not.toContain('Stamp and Signature');
      expect(writtenHtml).toContain('window.print()');

      openSpy.mockRestore();
    });
  });

  describe('Building A – 10-Month Electricity Bill Calculations & Audit', () => {
    it('contains exact 10 billing cycles in DEFAULT_BUILDING_A_SEED with continuous meter readings', () => {
      expect(DEFAULT_BUILDING_A_SEED).toHaveLength(10);

      // Verify uninterrupted continuity: each cycle's currReading === next cycle's prevReading
      for (let i = 0; i < DEFAULT_BUILDING_A_SEED.length - 1; i++) {
        const newerBill = DEFAULT_BUILDING_A_SEED[i];
        const olderBill = DEFAULT_BUILDING_A_SEED[i + 1];
        expect(Number(newerBill.prevReading)).toBe(Number(olderBill.currReading));
      }

      // Check first reading and latest reading
      expect(Number(DEFAULT_BUILDING_A_SEED[9].prevReading)).toBe(132533);
      expect(Number(DEFAULT_BUILDING_A_SEED[0].currReading)).toBe(150245);

      // Total consumption = 150245 - 132533 = 17712 units
      const totalUnits = DEFAULT_BUILDING_A_SEED.reduce((sum, b) => sum + b.consumption, 0);
      expect(totalUnits).toBe(17712);

      // Total amount = 373990
      const totalAmount = DEFAULT_BUILDING_A_SEED.reduce((sum, b) => sum + b.grandTotal, 0);
      expect(totalAmount).toBe(373990);
    });

    it('matches the OCR physical bill details for September 2026', () => {
      const sepBill = DEFAULT_BUILDING_A_SEED[0];
      expect(sepBill.periodLabel).toBe('Sep 2026 (16 Aug – 14 Sep)');
      expect(sepBill.consumption).toBe(1760);
      expect(sepBill.grandTotal).toBe(37140);
      expect(sepBill.consumerNo).toBe('170003586858');
      expect(sepBill.meterNo).toBe('08210034428');
      expect(sepBill.fixedCharge).toBe(445);
      expect(sepBill.wheelingCharge).toBe(2816);
      expect(sepBill.energyCharge).toBe(27745.89);
      expect(sepBill.fuelAdj).toBe(724.10);
      expect(sepBill.dutyAmount).toBe(5076.96);
      expect(sepBill.promptAmount).toBe(36820);
      expect(sepBill.afterDueAmount).toBe(37600);
    });

    it('accurately computes monthly consumption across calendar months for Building A', () => {
      const monthlyData = computeMonthlyConsumption(DEFAULT_BUILDING_A_SEED);
      expect(monthlyData.length).toBeGreaterThanOrEqual(10);

      const totalEstimatedUnits = monthlyData.reduce((sum, m) => sum + m.units, 0);
      // Sum of distributed units matches 17,712 within floating point precision
      expect(Math.round(totalEstimatedUnits)).toBe(17712);

      const totalEstimatedCost = monthlyData.reduce((sum, m) => sum + m.estCost, 0);
      expect(Math.round(totalEstimatedCost)).toBe(373990);
    });

    it('switches to Building A tab, renders consumer header, KPI cards, and breakdown', async () => {
      const user = userEvent.setup();
      render(<ElectricityTracker isAdmin={true} />);

      await waitFor(() => screen.getByRole('button', { name: /a building electricity/i }));
      const buildingATab = screen.getByRole('button', { name: /a building electricity/i });
      await user.click(buildingATab);

      // Verify Building A consumer header
      await waitFor(() => {
        expect(screen.getByText(/the chairman euriska a wing \(common lift\)/i)).toBeInTheDocument();
        expect(screen.getAllByText(/170003586858/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/08210034428/i).length).toBeGreaterThan(0);
      });

      // Verify KPI values: 3,73,990 and 17,712 units
      expect(screen.getAllByText(/3,73,990/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/17,712 Units/i)).toBeInTheDocument();

      // Verify Monthly Breakdown card for Building A
      expect(screen.getByText(/building a monthly consumption breakdown/i)).toBeInTheDocument();

      // Verify table rows for Sep 2026
      expect(screen.getByText(/Sep 2026 \(16 Aug – 14 Sep\)/i)).toBeInTheDocument();
      expect(screen.getAllByText(/150245/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/148485/i).length).toBeGreaterThan(0);
    });

    it('triggers Building A Statement PDF print when Statement PDF button is clicked in Building A tab', async () => {
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
      const buildingATab = screen.getByRole('button', { name: /a building electricity/i });
      await user.click(buildingATab);

      await waitFor(() => screen.getByRole('button', { name: /statement pdf/i }));
      await user.click(screen.getByRole('button', { name: /statement pdf/i }));

      expect(openSpy).toHaveBeenCalledWith('', '_blank');
      expect(mockPrintWindow.document.write).toHaveBeenCalled();
      expect(writtenHtml).toContain('Building A Common Lift Electricity Statement');
      expect(writtenHtml).toContain('170003586858');
      expect(writtenHtml).toContain('THE CHAIRMAN EURISKA A WING');
      expect(writtenHtml).toContain('Avg Rate / Unit');
      expect(writtenHtml).toContain('₹21.12 / u');
      expect(writtenHtml).toContain('Rate/U');
      expect(writtenHtml).toContain('window.print()');

      openSpy.mockRestore();
    });

    it('triggers Monthly Breakdown PDF print with Avg Rate / Unit calculation', async () => {
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
      const buildingATab = screen.getByRole('button', { name: /a building electricity/i });
      await user.click(buildingATab);

      await waitFor(() => screen.getByRole('button', { name: /download pdf/i }));
      await user.click(screen.getByRole('button', { name: /download pdf/i }));

      expect(openSpy).toHaveBeenCalledWith('', '_blank');
      expect(mockPrintWindow.document.write).toHaveBeenCalled();
      expect(writtenHtml).toContain('Monthly Electricity Consumption');
      expect(writtenHtml).toContain('Avg Rate / Unit');
      expect(writtenHtml).toContain('Avg Rate (₹/u)');
      expect(writtenHtml).toContain('₹21.12');
      expect(writtenHtml).toContain('window.print()');

      openSpy.mockRestore();
    });
  });
});
