import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ManagerTaskTracker from './ManagerTaskTracker';

vi.mock('../../firebase.js', () => ({
  db: null,
  isFirebaseConfigured: false,
  ensureFirebaseSession: vi.fn().mockResolvedValue(null),
}));

describe('ManagerTaskTracker Component', () => {
  it('renders banner and main headings', () => {
    render(<ManagerTaskTracker isAdmin={false} />);
    expect(screen.getByText(/Task & Deadline Tracker/i)).toBeInTheDocument();
    expect(screen.getByText(/Managed by Siddu/i)).toBeInTheDocument();
  });

  it('renders Export CSV and Print PDF buttons', () => {
    render(<ManagerTaskTracker isAdmin={false} />);
    expect(screen.getByRole('button', { name: /Export CSV/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Print PDF/i })).toBeInTheDocument();
  });

  it('does not show Add Task button for non-admin users', () => {
    render(<ManagerTaskTracker isAdmin={false} />);
    expect(screen.queryByRole('button', { name: /Add Task/i })).not.toBeInTheDocument();
  });

  it('shows Add Task button when isAdmin is true', () => {
    render(<ManagerTaskTracker isAdmin={true} />);
    expect(screen.getByRole('button', { name: /Add Task/i })).toBeInTheDocument();
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

    render(<ManagerTaskTracker isAdmin={false} />);
    const pdfBtn = screen.getByRole('button', { name: /Print PDF/i });
    fireEvent.click(pdfBtn);

    expect(mockOpen).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('switches tabs between Common Work and A Building Work', () => {
    render(<ManagerTaskTracker isAdmin={false} />);
    const aBuildingTab = screen.getByRole('button', { name: /A Building Work/i });
    fireEvent.click(aBuildingTab);

    // Initial A building task is AB-001
    expect(screen.getByText('AB-001')).toBeInTheDocument();
  });

  it('filters tasks by search input', () => {
    render(<ManagerTaskTracker isAdmin={false} />);
    const searchInput = screen.getByPlaceholderText(/Search/i);
    
    // Initial task includes CT-001 (EPDM)
    expect(screen.getByText('CT-001')).toBeInTheDocument();
    
    fireEvent.change(searchInput, { target: { value: 'Fire Safety' } });
    expect(screen.getByText('CT-004')).toBeInTheDocument();
    expect(screen.queryByText('CT-001')).not.toBeInTheDocument();
  });
});
