import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShopMaintenanceTracker from './ShopMaintenanceTracker.jsx';
import { setDoc } from 'firebase/firestore';

vi.mock('../../firebase.js', () => ({
  db: {},
  ensureFirebaseSession: vi.fn().mockResolvedValue(null),
  isFirebaseConfigured: true,
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, collectionName, docId) => `${collectionName}/${docId}`),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
  serverTimestamp: vi.fn(() => 'server-timestamp'),
  setDoc: vi.fn().mockResolvedValue(undefined),
}));

describe('ShopMaintenanceTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tabs for all shops and the fed shop ledger data', () => {
    const html = renderToStaticMarkup(<ShopMaintenanceTracker />);

    expect(html).toContain('Shop 1');
    expect(html).toContain('Shop 8');
    expect(html).toContain('Mr. Gulshan Vasnani');
    expect(html).toContain('Monthly Ledger');
    expect(html).toContain('Apr 21 to Mar 22');
    expect(html).toContain('Apr 26 to Mar 27');
  });

  it('saves receipt updates to Firebase when Save Receipts is clicked', async () => {
    const user = userEvent.setup();
    render(<ShopMaintenanceTracker isAdmin />);

    await user.click(screen.getByRole('button', { name: /\+ add maintenance/i }));
    await user.click(screen.getAllByRole('button', { name: /shop 1/i }).at(-1));

    const receiptInputs = screen.getAllByPlaceholderText(/e\.g\. 1500/i);
    await user.type(receiptInputs[1], '2000');
    await user.click(screen.getByRole('button', { name: /save receipts/i }));

    await waitFor(() => expect(setDoc).toHaveBeenCalled());
    expect(setDoc).toHaveBeenLastCalledWith(
      'shopMaintenance/shop_maintenance_ledger',
      expect.objectContaining({
        shops: expect.any(Array),
        updatedAt: 'server-timestamp',
      }),
      { merge: true }
    );
  });

  it('shows edit and delete controls for admins', async () => {
    render(<ShopMaintenanceTracker isAdmin />);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /edit/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: /delete/i }).length).toBeGreaterThan(0);
    });
  });

  it('renders Print Summary, Print Shop Statement, and Generate Shop Notices buttons', () => {
    render(<ShopMaintenanceTracker isAdmin={false} />);

    expect(screen.getByRole('button', { name: /print summary \(all\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /print shop 1 statement \(pdf\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate shop notices/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create notice for shop 1/i })).toBeInTheDocument();
  });

  it('opens notice generator modal and allows selecting single or all pending shops', async () => {
    const user = userEvent.setup();
    render(<ShopMaintenanceTracker isAdmin={false} />);

    // Click Generate Shop Notices button
    await user.click(screen.getByRole('button', { name: /generate shop notices/i }));

    expect(screen.getByText(/commercial shop maintenance notice generator/i)).toBeInTheDocument();
    expect(screen.getByText(/all pending dues/i)).toBeInTheDocument();
    expect(screen.getByText(/remittance account info/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /print \/ download pdf/i })).toBeInTheDocument();

    // Switch to single shop
    await user.click(screen.getByRole('button', { name: /^single shop$/i }));
    expect(screen.getByRole('button', { name: /send whatsapp/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy text/i })).toBeInTheDocument();

    // Close modal
    await user.click(screen.getByRole('button', { name: /^close$/i }));
    expect(screen.queryByText(/commercial shop maintenance notice generator/i)).not.toBeInTheDocument();
  });

  it('renders auto-billing status and allows admin to sync all due months', async () => {
    const user = userEvent.setup();
    render(<ShopMaintenanceTracker isAdmin />);

    expect(screen.getByText(/⚡ Auto-Billed on 1st of every month/i)).toBeInTheDocument();
    const syncButton = screen.getByRole('button', { name: /⚡ sync dues/i });
    expect(syncButton).toBeInTheDocument();

    await user.click(syncButton);
    await waitFor(() => expect(setDoc).toHaveBeenCalled());
  });
});


