import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TimesOfIndiaTracker from './TimesOfIndiaTracker.jsx';

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
    expect(html).toContain('1,44,000');
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

    // Verify Jul 2025 - Sept 2026 (15 months) is present across flats 302, 904, 1002
    expect(screen.getAllByText(/Jul 2025 – Sept 2026/i).length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText(/15/i).length).toBeGreaterThanOrEqual(3);
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
});
