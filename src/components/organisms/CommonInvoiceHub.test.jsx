import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommonInvoiceHub from './CommonInvoiceHub.jsx';

describe('CommonInvoiceHub Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders static markup with hero header and invoice modules', () => {
    const html = renderToStaticMarkup(<CommonInvoiceHub />);
    expect(html).toContain('Common Invoice &amp; Demand Notice Hub');
    expect(html).toContain('Commercial Shops');
    expect(html).toContain('Tata Electricity');
    expect(html).not.toContain('Times of India');
    expect(html).toContain('Maintenance');
    expect(html).toContain('Sinking Fund');
  });

  it('renders all category switcher buttons and cards without TOI', () => {
    render(<CommonInvoiceHub isAdmin={false} />);

    expect(screen.getByText(/Common Invoice & Demand Notice Hub/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /all invoice systems/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /commercial shops/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tata electricity bill/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /times of india/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/include times of india/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /month-range \(maintenance \+ sinking\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /custom invoice builder/i })).toBeInTheDocument();
  });

  it('calculates Maintenance (2850) and Sinking Fund (150) based on selected month range', () => {
    render(<CommonInvoiceHub isAdmin={false} />);

    // Default range is 2024-04 to 2025-03 = 12 months
    expect(screen.getByText(/12 Months Counted/i)).toBeInTheDocument();
    expect(screen.getByText(/12 mos × ₹2,850/i)).toBeInTheDocument();
    expect(screen.getByText(/12 mos × ₹150/i)).toBeInTheDocument();
  });

  it('switches to Custom Invoice Builder and allows adding/editing line items', async () => {
    const user = userEvent.setup();
    render(<CommonInvoiceHub isAdmin={false} />);

    // Switch to Custom Invoice Builder
    await user.click(screen.getByRole('button', { name: /custom invoice builder/i }));

    expect(screen.getByText(/Custom Invoice Configuration/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ add item/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /print \/ save pdf/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /whatsapp/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();

    // Click + Add Item
    await user.click(screen.getByRole('button', { name: /\+ add item/i }));
    expect(screen.getByText(/Line Items \(3\)/i)).toBeInTheDocument();

    // Toggle to Notice
    await user.click(screen.getByRole('button', { name: /^notice$/i }));
    expect(screen.getAllByText(/DEMAND NOTICE/i).length).toBeGreaterThanOrEqual(1);

    // Back to Month-Range Calculator
    await user.click(screen.getByRole('button', { name: /← back to month-range calculator/i }));
    expect(screen.getByText(/Select Billing Month Range/i)).toBeInTheDocument();
  });

  it('switches to Combined 3-Flats Bill and verifies A-302, A-904, A-1002, total ₹67,200 and bank details', async () => {
    const user = userEvent.setup();
    render(<CommonInvoiceHub isAdmin={false} />);

    // Switch to Combined 3-Flats Bill
    await user.click(screen.getByRole('button', { name: /combined 3-flats bill/i }));

    // Expect 3 flats headers and totals
    expect(screen.getByText(/Combined 3-Flats Demand Notice \(A-302, A-904, A-1002\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/₹67,200/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/FLAT A-302/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/FLAT A-904/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/FLAT A-1002/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/₹31,200/i).length).toBeGreaterThanOrEqual(1);

    // Bank details
    expect(screen.getAllByText(/50200075533530/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/HDFC0002454/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Undri Branch/i).length).toBeGreaterThanOrEqual(1);

    // Action buttons
    expect(screen.getByRole('button', { name: /print \/ download combined pdf/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send whatsapp/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy full notice/i })).toBeInTheDocument();
  });

  it('supports selecting Flat A-1002 with earlier pending arrears (₹13,200) in month-range calculator', async () => {
    const user = userEvent.setup();
    render(<CommonInvoiceHub isAdmin={false} />);

    // Click Flat A-1002 in month range calculator
    await user.click(screen.getByRole('button', { name: /^flat a-1002$/i }));

    // Earlier pending should be included
    expect(screen.getByText(/Earlier Pending Arrears \(Oct 2024 – Mar 2025\): ₹13,200/i)).toBeInTheDocument();
    expect(screen.getAllByText(/₹12,600/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/₹600/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders official Times of India (Times Horizon) invoice template for A-302, A-904, and A-1002 with batch printing', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => ({
      document: { write: vi.fn(), close: vi.fn() }
    }));

    render(<CommonInvoiceHub isAdmin={false} />);

    // Switch to Combined 3-Flats / TOI Bill
    await user.click(screen.getByRole('button', { name: /combined 3-flats bill/i }));

    // Verify sub-tabs exist
    expect(screen.getAllByRole('button', { name: /flat a-302/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: /flat a-904/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: /flat a-1002/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /batch print all 3 invoices \(a4\)/i })).toBeInTheDocument();

    // Verify Flat A-302 official template layout
    expect(screen.getAllByText(/Majestique Euriska A Building Sahakari Gruhrachna Sanstha Maryadit/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/ME\/A\/18\/Oct26/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Times Horizon Private Limited/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/A WING- 302/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Eighteen Thousand Only\./i).length).toBeGreaterThanOrEqual(1);

    // Switch to Flat A-1002 via sub-tab
    await user.click(screen.getByRole('button', { name: /Flat A-1002 \(ME\/A\/17\/Oct-26\)/i }));
    expect(screen.getAllByText(/ME\/A\/17\/Oct-26/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/A WING- 1002/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Thirty One Thousand Two Hundred Only\./i).length).toBeGreaterThanOrEqual(1);

    // Verify circular stamp is removed from template
    expect(screen.queryByText(/Dt\. 9\/8\/19/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Include TOI Subscription/i)).not.toBeInTheDocument();

    // Verify Bill Period is rendered without border on top
    expect(screen.getAllByText(/Bill Period\s*:\s*01-10-2026 to 30-03-2027/i).length).toBeGreaterThanOrEqual(1);

    // Click Batch Print All 3 Invoices
    await user.click(screen.getByRole('button', { name: /batch print all 3 invoices \(a4\)/i }));
    expect(openSpy).toHaveBeenCalled();

    openSpy.mockRestore();
  });
});

