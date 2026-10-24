import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AmcTracker, { DEFAULT_EQUIPMENT_RECORDS, DEFAULT_CONTRACTS } from './AmcTracker.jsx';

// Mock Firebase
vi.mock('../../firebase.js', () => ({
  db: null,
  isFirebaseConfigured: false,
  ensureFirebaseSession: vi.fn().mockResolvedValue(true)
}));

describe('AmcTracker Component', () => {
  it('renders heading, KPIs, and all user equipment records', () => {
    render(<AmcTracker isAdmin={true} />);

    expect(screen.getByText(/AMC & Equipment Maintenance Tracker/i)).toBeInTheDocument();
    expect(screen.getByText(/Tracked Equipments/i)).toBeInTheDocument();

    // Verify all 10 equipments from user prompt are displayed
    expect(screen.getByText(/AC – Clubhouse & Gym/i)).toBeInTheDocument();
    expect(screen.getByText(/DG Battery/i)).toBeInTheDocument();
    expect(screen.getByText(/DG Machine/i)).toBeInTheDocument();
    expect(screen.getByText(/DG Diesel/i)).toBeInTheDocument();
    expect(screen.getByText(/Gym Equipment/i)).toBeInTheDocument();
    expect(screen.getByText(/Fire Motor \/ Fire Pump/i)).toBeInTheDocument();
    expect(screen.getByText(/^Fire AMC$/i)).toBeInTheDocument();
    expect(screen.getByText(/Fire Extinguishers/i)).toBeInTheDocument();
    expect(screen.getByText(/Water Service \/ Water System/i)).toBeInTheDocument();
    expect(screen.getByText(/Park Plus \(Automated Gate & Security\)/i)).toBeInTheDocument();
  });

  it('renders vendor names from the user table', () => {
    render(<AmcTracker />);

    expect(screen.getByText(/Apex Enterprises/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Kirloskar Care/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Ghule Petrolium/i)).toBeInTheDocument();
    expect(screen.getByText(/Pralhad Ambekar/i)).toBeInTheDocument();
    expect(screen.getByText(/Ankush Fire Extingusher Enterprises/i)).toBeInTheDocument();
    expect(screen.getByText(/Real Aqua Services/i)).toBeInTheDocument();
    expect(screen.getByText(/Park\+ Technologies Pvt Ltd/i)).toBeInTheDocument();
  });

  it('displays the user remark "Check With rohan Sir"', () => {
    render(<AmcTracker />);

    expect(screen.getByText(/Check With rohan Sir/i)).toBeInTheDocument();
  });

  it('filters equipment records when searching', () => {
    render(<AmcTracker />);

    expect(screen.getByText(/AC – Clubhouse & Gym/i)).toBeInTheDocument();
    expect(screen.getByText(/DG Battery/i)).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Search equipment, vendor, or remarks/i);
    fireEvent.change(searchInput, { target: { value: 'rohan' } });

    expect(screen.getByText(/DG Battery/i)).toBeInTheDocument();
    expect(screen.queryByText(/AC – Clubhouse & Gym/i)).not.toBeInTheDocument();
  });

  it('switches between Equipment Register and Financial Contracts tabs', () => {
    render(<AmcTracker />);

    const contractsTabBtn = screen.getByRole('button', { name: /Financial Contracts & Schedules/i });
    fireEvent.click(contractsTabBtn);

    expect(screen.getByText(/Active AMC Contracts/i)).toBeInTheDocument();
    expect(screen.getByText(/Park\+ Automated Gate & FastTag/i)).toBeInTheDocument();
  });
});
