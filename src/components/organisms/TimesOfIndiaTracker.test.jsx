import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TimesOfIndiaTracker, {
  BILLS_TEMPLATE,
  BILLS_TEMPLATE_1002,
  getBillsTemplate,
  makeDefaultFlats,
  normalizeFlats
} from './TimesOfIndiaTracker.jsx';

describe('TimesOfIndiaTracker Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders static markup with flats 302, 904, 1002 and tariff slabs', () => {
    const html = renderToStaticMarkup(<TimesOfIndiaTracker />);
    expect(html).toContain('Times of India Tracker');
    expect(html).toContain('A-302');
    expect(html).toContain('A-904');
    expect(html).toContain('A-1002');
    expect(html).toContain('1,62,000');
  });

  it('renders Payment Reconciliation tab with ₹4,32,000 due, ₹4,25,100 paid, and ₹6,900 net outstanding', () => {
    render(<TimesOfIndiaTracker isAdmin={false} />);

    expect(screen.getByText(/Times of India Tracker/i)).toBeInTheDocument();
    expect(screen.getByText(/SOCIETY MAINTENANCE PAYMENT RECONCILIATION – TIME OF INDIA/i)).toBeInTheDocument();
    expect(screen.getAllByText(/4,32,000/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/4,25,100/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/6,900/i).length).toBeGreaterThanOrEqual(1);

    // Payment Date / Bank for Apr 2026 - Sept 2026
    expect(screen.getAllByText(/23-06-2026 \(HDFC\)/i).length).toBeGreaterThanOrEqual(1);

    // Shortfall and Extra Paid
    expect(screen.getByText(/C\. WHERE THEY PAY SHORT/i)).toBeInTheDocument();
    expect(screen.getAllByText(/13,200/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/D\. WHERE THEY PAY EXTRA/i)).toBeInTheDocument();
    expect(screen.getAllByText(/6,300/i).length).toBeGreaterThanOrEqual(1);

    // Action buttons in reconciliation view
    expect(screen.getByRole('button', { name: /print statement \/ pdf/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /share on whatsapp/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy summary/i })).toBeInTheDocument();
  });

  it('switches to All Flats Ledger tab and renders summary metrics and generate invoice buttons', async () => {
    const user = userEvent.setup();
    render(<TimesOfIndiaTracker isAdmin={false} />);

    // Switch to All Flats Ledger
    await user.click(screen.getByRole('button', { name: /all flats ledger/i }));

    expect(screen.getByText(/Grand Total \(3 Flats\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate toi invoices/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /invoice/i }).length).toBeGreaterThanOrEqual(3);

    // Verify Jul 2025 – Mar 2026, Apr 2026 – Sep 2026, and Oct 2026 – Mar 2027 across flats 302, 904, 1002
    expect(screen.getAllByText(/Jul 2025 – Mar 2026/i).length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText(/Apr 2026 – Sep 2026/i).length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText(/Oct 2026 – Mar 2027/i).length).toBeGreaterThanOrEqual(3);
  });

  it('opens invoice modal for a specific flat and renders remittance details', async () => {
    const user = userEvent.setup();
    render(<TimesOfIndiaTracker isAdmin={false} />);

    // Switch to All Flats Ledger
    await user.click(screen.getByRole('button', { name: /all flats ledger/i }));

    const genButtons = screen.getAllByRole('button', { name: /🧾 Invoice/i });
    await user.click(genButtons[0]);

    expect(screen.getByText(/Times of India Subscription Invoice Generator/i)).toBeInTheDocument();
    expect(screen.getAllByText(/50200075533530/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/HDFC0002454/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /print \/ download pdf/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send whatsapp/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy text/i })).toBeInTheDocument();
  });

  it('switches between individual flats and all 3 flats in invoice modal', async () => {
    const user = userEvent.setup();
    render(<TimesOfIndiaTracker isAdmin={false} />);

    await user.click(screen.getByRole('button', { name: /generate toi invoices/i }));

    expect(screen.getByText(/Times of India Subscription Invoice Generator/i)).toBeInTheDocument();

    // Click Single Flat selector button
    await user.click(screen.getByRole('button', { name: /^single flat$/i }));
    expect(screen.getAllByText(/Flat A-302/i).length).toBeGreaterThanOrEqual(1);

    // Switch to Pending Flats
    await user.click(screen.getByRole('button', { name: /pending flats/i }));
    expect(screen.getByRole('button', { name: /print \/ download pdf/i })).toBeInTheDocument();

    // Close modal
    await user.click(screen.getByRole('button', { name: /^close$/i }));
    expect(screen.queryByText(/Times of India Subscription Invoice Generator/i)).not.toBeInTheDocument();
  });

  it('calculates Month-Range Maintenance (2850) and Sinking Fund (150) in modal', async () => {
    const user = userEvent.setup();
    render(<TimesOfIndiaTracker isAdmin={false} />);

    // Switch to All Flats Ledger
    await user.click(screen.getByRole('button', { name: /all flats ledger/i }));

    const genButtons = screen.getAllByRole('button', { name: /🧾 Invoice/i });
    await user.click(genButtons[0]);

    // Check month-range calculation is active by default
    expect(screen.getByText(/12 Months Counted/i)).toBeInTheDocument();
    expect(screen.getByText(/12 mos × ₹2,850/i)).toBeInTheDocument();
    expect(screen.getByText(/12 mos × ₹150/i)).toBeInTheDocument();

    // Switch to historical ledger
    await user.click(screen.getByRole('button', { name: /60-mo toi ledger/i }));
    expect(screen.getByText(/Total 60-Month Subscription/i)).toBeInTheDocument();
  });

  it('divides FY 2024-25 into two parts for A-1002 only (Part I Apr–Sept 2024 & Part II Oct 2024–Mar 2025)', async () => {
    const user = userEvent.setup();
    render(<TimesOfIndiaTracker isAdmin={true} />);

    // Switch to Flat A-1002 tab
    await user.click(screen.getByRole('button', { name: /flat a-1002/i }));

    // Verify FY 2024-25 (I) and FY 2024-25 (II) are rendered for A-1002
    expect(screen.getByText(/FY 2024-25 \(I\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Apr 2024 – Sept 2024/i)).toBeInTheDocument();

    expect(screen.getByText(/FY 2024-25 \(II\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Oct 2024 – Mar 2025/i)).toBeInTheDocument();

    // Check that standard undivided FY 2024-25 remains active for Flat A-302
    await user.click(screen.getByRole('button', { name: /flat a-302/i }));
    expect(screen.getByText(/^FY 2024-25$/i)).toBeInTheDocument();
    expect(screen.getByText(/Apr 2024 – Mar 2025/i)).toBeInTheDocument();
  });

  it('maintains 66 months and ₹1,62,000 totals with divided templates', () => {
    // Standard template for A-302 and A-904
    expect(getBillsTemplate('A-302')).toBe(BILLS_TEMPLATE);
    expect(getBillsTemplate('A-904')).toBe(BILLS_TEMPLATE);
    expect(BILLS_TEMPLATE.length).toBe(8);
    expect(BILLS_TEMPLATE.reduce((s, b) => s + b.months, 0)).toBe(66);
    expect(BILLS_TEMPLATE.reduce((s, b) => s + b.amount, 0)).toBe(162000);

    // Divided template for A-1002 only
    expect(getBillsTemplate('A-1002')).toBe(BILLS_TEMPLATE_1002);
    expect(BILLS_TEMPLATE_1002.length).toBe(9);
    expect(BILLS_TEMPLATE_1002.reduce((s, b) => s + b.months, 0)).toBe(66);
    expect(BILLS_TEMPLATE_1002.reduce((s, b) => s + b.amount, 0)).toBe(162000);

    // Verify split details for A-1002 FY 2024-25
    const part1 = BILLS_TEMPLATE_1002.find(b => b.id === '4a');
    const part2 = BILLS_TEMPLATE_1002.find(b => b.id === '4b');
    expect(part1).toEqual({
      id: '4a',
      year: 'FY 2024-25 (I)',
      period: 'Apr 2024 – Sept 2024',
      months: 6,
      rate: 2200,
      amount: 13200
    });
    expect(part2).toEqual({
      id: '4b',
      year: 'FY 2024-25 (II)',
      period: 'Oct 2024 – Mar 2025',
      months: 6,
      rate: 2200,
      amount: 13200
    });

    // Verify newly divided rows for FY 2025-26 and FY 2026-27
    const bill6 = BILLS_TEMPLATE.find(b => b.id === 6);
    const bill7 = BILLS_TEMPLATE.find(b => b.id === 7);
    const bill8 = BILLS_TEMPLATE.find(b => b.id === 8);
    expect(bill6).toEqual({
      id: 6,
      year: 'FY 2025-26 (II)',
      period: 'Jul 2025 – Mar 2026',
      months: 9,
      rate: 3000,
      amount: 27000
    });
    expect(bill7).toEqual({
      id: 7,
      year: 'FY 2026-27 (I)',
      period: 'Apr 2026 – Sep 2026',
      months: 6,
      rate: 3000,
      amount: 18000
    });
    expect(bill8).toEqual({
      id: 8,
      year: 'FY 2026-27 (II)',
      period: 'Oct 2026 – Mar 2027',
      months: 6,
      rate: 3000,
      amount: 18000
    });

    // Verify defaults and normalization
    const defaults = makeDefaultFlats();
    const flat1002 = defaults.find(f => f.id === 'A-1002');
    expect(flat1002.bills.length).toBe(9);
    expect(flat1002.bills.find(b => b.id === '4a').status).toBe('Paid');
    expect(flat1002.bills.find(b => b.id === '4b').status).toBe('Pending');
    expect(flat1002.bills.find(b => b.id === 8).status).toBe('Pending');

    // Verify legacy migration
    const legacyRaw = [
      { id: 'A-302', flatNo: 'A-302', bills: BILLS_TEMPLATE.map(b => ({ ...b, status: 'Paid' })) },
      { id: 'A-1002', flatNo: 'A-1002', bills: BILLS_TEMPLATE.map(b => ({ ...b, status: 'Pending' })) }
    ];
    const normalized = normalizeFlats(legacyRaw);
    const norm1002 = normalized.find(f => f.id === 'A-1002');
    expect(norm1002.bills.length).toBe(9);
    expect(norm1002.bills.find(b => b.id === '4a').status).toBe('Paid');
    expect(norm1002.bills.find(b => b.id === '4b').status).toBe('Pending');
    expect(norm1002.bills.find(b => b.id === 8).status).toBe('Pending');
  });
});
