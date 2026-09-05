import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SecurityAttendanceManager from './SecurityAttendanceManager';

vi.mock('../../firebase.js', () => ({
  db: null,
  isFirebaseConfigured: false,
  ensureFirebaseSession: vi.fn().mockResolvedValue(null),
}));

describe('SecurityAttendanceManager Component', () => {
  it('renders Guard deployment entry table heading and Excel/PDF buttons', () => {
    render(<SecurityAttendanceManager isAdmin={false} />);
    expect(screen.getByText(/Guard deployment entry table/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Excel/i })).toBeInTheDocument();
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

    render(<SecurityAttendanceManager isAdmin={false} />);
    const pdfBtn = screen.getByRole('button', { name: /Print PDF/i });
    fireEvent.click(pdfBtn);

    expect(mockOpen).toHaveBeenCalledWith('', '_blank');
    expect(writtenHtml).toContain('Security Attendance Register');
    expect(writtenHtml).toContain('Guard Deployment Entry Table');
    expect(writtenHtml).toContain('window.print()');

    vi.unstubAllGlobals();
  });
});
