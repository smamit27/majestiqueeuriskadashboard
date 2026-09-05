import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TankerTracker from './TankerTracker';

vi.mock('../../firebase.js', () => ({
  db: null,
  isFirebaseConfigured: false,
  ensureFirebaseSession: vi.fn().mockResolvedValue(null),
}));

describe('TankerTracker Component', () => {
  it('renders Daily entry table heading and Download/PDF buttons', () => {
    render(<TankerTracker isAdmin={false} />);
    expect(screen.getByText(/Daily entry table/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Print PDF/i })).toBeInTheDocument();
  });

  it('triggers window.open with PDF content when Print PDF button is clicked', () => {
    let writtenHtml = '';
    const mockOpen = vi.fn().mockReturnValue({
      document: {
        open: vi.fn(),
        write: vi.fn((html) => { writtenHtml = html; }),
        close: vi.fn(),
      },
    });
    vi.stubGlobal('open', mockOpen);

    render(<TankerTracker isAdmin={false} />);
    const pdfBtn = screen.getByRole('button', { name: /Print PDF/i });
    fireEvent.click(pdfBtn);

    expect(mockOpen).toHaveBeenCalledWith('', '_blank');
    expect(writtenHtml).toContain('Water Tanker Supply Register');
    expect(writtenHtml).toContain('Daily Water Tanker Deliveries & Expenditure Log');
    expect(writtenHtml).toContain('window.print()');

    vi.unstubAllGlobals();
  });
});
