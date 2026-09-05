import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ParkingAllotmentTracker from './ParkingAllotmentTracker.jsx';

// Mock Firebase
vi.mock('../../firebase.js', () => ({
  db: null,
  isFirebaseConfigured: false,
  ensureFirebaseSession: vi.fn().mockResolvedValue(true)
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => null }),
  setDoc: vi.fn().mockResolvedValue(true)
}));

describe('ParkingAllotmentTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders banner, title and summary metrics for Wing A (A-101 to A-1108)', async () => {
    render(<ParkingAllotmentTracker isAdmin={true} />);

    expect(screen.getByText(/Parking Allotment Roster/i)).toBeInTheDocument();
    expect(screen.getAllByText(/A-101 to A-1108/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Total Flats')).toBeInTheDocument();
    expect(screen.getAllByText('Open Parking').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Covered Parking').length).toBeGreaterThan(0);
  });

  it('renders verified open parking records and covered parking entries', async () => {
    render(<ParkingAllotmentTracker isAdmin={false} />);

    // Check specific allotments from sheet
    expect(screen.getByText('A-102')).toBeInTheDocument();
    expect(screen.getByText('OP-39')).toBeInTheDocument();

    expect(screen.getByText('A-104')).toBeInTheDocument();
    expect(screen.getByText('OP-50')).toBeInTheDocument();

    expect(screen.getByText('A-302')).toBeInTheDocument();
    expect(screen.getByText('OP-48')).toBeInTheDocument();

    expect(screen.getByText('A-1105')).toBeInTheDocument();
    expect(screen.getByText('OP-60')).toBeInTheDocument();

    // Verify Customer / Resident Name, Occupancy, Vehicle No are NOT present
    expect(screen.queryByText(/Customer \/ Resident Name/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Occupancy$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Vehicle No$/i)).not.toBeInTheDocument();
  });

  it('filters roster by search query for flat number or slot', async () => {
    render(<ParkingAllotmentTracker isAdmin={false} />);

    const searchInput = screen.getByPlaceholderText(/Search flat/i);
    fireEvent.change(searchInput, { target: { value: 'OP-43' } });

    // A-506 has OP-43
    expect(screen.getByText('A-506')).toBeInTheDocument();
    expect(screen.getByText('OP-43')).toBeInTheDocument();

    // A-102 should be filtered out
    expect(screen.queryByText('A-102')).not.toBeInTheDocument();
  });

  it('filters roster by Floor selection', async () => {
    render(<ParkingAllotmentTracker isAdmin={false} />);

    const floorSelect = screen.getByRole('combobox');
    fireEvent.change(floorSelect, { target: { value: '11' } });

    // Floor 11 flats should be shown
    expect(screen.getByText('A-1101')).toBeInTheDocument();
    expect(screen.getByText('A-1102')).toBeInTheDocument();
    expect(screen.getByText('A-1105')).toBeInTheDocument();
    expect(screen.getByText('A-1107')).toBeInTheDocument();
    expect(screen.getByText('A-1108')).toBeInTheDocument();

    // Floor 1 flats should be filtered out
    expect(screen.queryByText('A-101')).not.toBeInTheDocument();
  });

  it('switches between Table, OP Grid, and Floor matrix views', async () => {
    render(<ParkingAllotmentTracker isAdmin={false} />);

    // Click OP Grid view
    const gridBtn = screen.getByRole('button', { name: /OP Grid/i });
    fireEvent.click(gridBtn);

    expect(screen.getByText(/Open Parking Layout Matrix/i)).toBeInTheDocument();
    expect(screen.getByText('OP-01')).toBeInTheDocument();
    expect(screen.getByText('OP-60')).toBeInTheDocument();

    // Click Floors view
    const floorsBtn = screen.getByRole('button', { name: /Floors/i });
    fireEvent.click(floorsBtn);

    expect(screen.getByText('Floor 11')).toBeInTheDocument();
    expect(screen.getByText('Floor 1')).toBeInTheDocument();
  });

  it('renders Export CSV and Print PDF action buttons', async () => {
    render(<ParkingAllotmentTracker isAdmin={false} />);

    expect(screen.getByRole('button', { name: /Export CSV/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Print PDF/i })).toBeInTheDocument();
  });

  it('allows admins to open the edit modal for a flat', async () => {
    render(<ParkingAllotmentTracker isAdmin={true} />);

    const editBtns = screen.getAllByRole('button', { name: /Edit/i });
    expect(editBtns.length).toBeGreaterThan(0);

    fireEvent.click(editBtns[0]);

    expect(screen.getByText(/Edit Flat/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Allotment/i })).toBeInTheDocument();
  });
});
