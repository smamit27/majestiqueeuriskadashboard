import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ParkPlusTracker from './ParkPlusTracker';

vi.mock('../../firebase.js', () => ({
  db: null,
  isFirebaseConfigured: false,
  ensureFirebaseSession: vi.fn().mockResolvedValue(null),
}));

describe('ParkPlusTracker Component', () => {
  it('renders banner and heading', () => {
    render(<ParkPlusTracker isAdmin={false} />);
    expect(screen.getByText(/Park\+ Payment Tracker/i)).toBeInTheDocument();
    expect(screen.getByText(/RFID & Automated Gate Solution/i)).toBeInTheDocument();
  });

  it('renders Export CSV and Print PDF buttons', () => {
    render(<ParkPlusTracker isAdmin={false} />);
    expect(screen.getByRole('button', { name: /Export CSV/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Print PDF/i })).toBeInTheDocument();
  });

  it('does not show Add Invoice button for non-admin users', () => {
    render(<ParkPlusTracker isAdmin={false} />);
    expect(screen.queryByRole('button', { name: /Add Invoice/i })).not.toBeInTheDocument();
  });

  it('shows Add Invoice button when isAdmin is true', () => {
    render(<ParkPlusTracker isAdmin={true} />);
    expect(screen.getByRole('button', { name: /Add Invoice/i })).toBeInTheDocument();
  });

  it('triggers window.open when Print PDF button is clicked', () => {
    const mockOpen = vi.fn().mockReturnValue({
      document: {
        open: vi.fn(),
        write: vi.fn(),
        close: vi.fn(),
      }
    });
    vi.stubGlobal('open', mockOpen);

    render(<ParkPlusTracker isAdmin={false} />);
    const pdfBtn = screen.getByRole('button', { name: /Print PDF/i });
    fireEvent.click(pdfBtn);

    expect(mockOpen).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('filters invoices by search query', () => {
    render(<ParkPlusTracker isAdmin={false} />);
    const searchInput = screen.getByPlaceholderText(/Search invoices/i);
    
    // Initial state has PTI-202526-MAY
    expect(screen.getByText('PTI-202526-MAY')).toBeInTheDocument();
    
    fireEvent.change(searchInput, { target: { value: 'PTI-202526-OCT' } });
    expect(screen.getByText('PTI-202526-OCT')).toBeInTheDocument();
    expect(screen.queryByText('PTI-202526-MAY')).not.toBeInTheDocument();
  });

  it('filters invoices by status chip', () => {
    render(<ParkPlusTracker isAdmin={false} />);
    const unpaidBtn = screen.getByRole('button', { name: /^Unpaid$/i });
    fireEvent.click(unpaidBtn);

    // Should only show Unpaid invoices (e.g. PTI-202526-JUL)
    expect(screen.getByText('PTI-202526-JUL')).toBeInTheDocument();
    expect(screen.queryByText('PTI-202526-MAY')).not.toBeInTheDocument();
  });
});
