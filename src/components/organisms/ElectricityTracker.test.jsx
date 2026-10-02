import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ElectricityTracker from './ElectricityTracker';

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

describe('ElectricityTracker – Tata Electricity Bill view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    // Find print buttons for Tata bills
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

  it('calls XLSX.writeFile when Export to Excel is clicked', async () => {
    const user = userEvent.setup();
    render(<ElectricityTracker isAdmin={true} />);
    await waitFor(() => screen.getByRole('button', { name: /export to excel/i }));

    await user.click(screen.getByRole('button', { name: /export to excel/i }));

    expect(XLSX.writeFile).toHaveBeenCalledTimes(1);
    const fileName = XLSX.writeFile.mock.calls[0][1];
    expect(fileName).toBe('Tata_Bills.xlsx');
  });
});
