import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HousekeepingAttendanceManager from './HousekeepingAttendanceManager';

vi.mock('../../firebase.js', () => ({
  db: null,
  isFirebaseConfigured: false,
  ensureFirebaseSession: vi.fn().mockResolvedValue(null),
}));

describe('HousekeepingAttendanceManager Component', () => {
  it('renders Manager entry table heading and Download/PDF buttons', () => {
    render(<HousekeepingAttendanceManager isAdmin={false} staffMembers={[]} />);
    expect(screen.getByText(/Manager entry table/i)).toBeInTheDocument();
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

    render(<HousekeepingAttendanceManager isAdmin={false} staffMembers={[{ id: '1', name: 'Staff 1' }]} />);
    const pdfBtn = screen.getByRole('button', { name: /Print PDF/i });
    fireEvent.click(pdfBtn);

    expect(mockOpen).toHaveBeenCalledWith('', '_blank');
    expect(writtenHtml).toContain('Housekeeping Attendance Register');
    expect(writtenHtml).toContain('Monthly Housekeeping & Cleaning Manpower Deployment');
    expect(writtenHtml).toContain('window.print()');

    vi.unstubAllGlobals();
  });
});
