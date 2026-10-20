import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WorkDistributionList from './WorkDistributionList';

describe('WorkDistributionList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders official header with society name and 9 portfolios', () => {
    render(<WorkDistributionList />);

    expect(screen.getByText(/Managing Committee — Work Distribution List/i)).toBeInTheDocument();
    expect(screen.getByText(/9 Portfolios/i)).toBeInTheDocument();
    expect(screen.getByText(/10 Members/i)).toBeInTheDocument();
    expect(screen.getByText(/10 Flats Mapped/i)).toBeInTheDocument();
  });

  it('renders all 9 responsibility areas from the official document', () => {
    render(<WorkDistributionList />);

    // Check all 9 areas
    expect(screen.getByText(/Security & Fire Safety/i)).toBeInTheDocument();
    expect(screen.getByText(/Housekeeping, Garden & Kids' Play Area/i)).toBeInTheDocument();
    expect(screen.getByText(/Park\+ \/ MyGate & Resident Complaints/i)).toBeInTheDocument();
    expect(screen.getByText(/Swimming Pool Management/i)).toBeInTheDocument();
    expect(screen.getByText(/Accounts & Finance/i)).toBeInTheDocument();
    expect(screen.getByText(/Electricity, Lifts, Lighting & Water Management/i)).toBeInTheDocument();
    expect(screen.getByText(/Solar, Network, CCTV & Technical Maintenance/i)).toBeInTheDocument();
    expect(screen.getByText(/Vendor Coordination & Common Area Maintenance/i)).toBeInTheDocument();
    expect(screen.getByText(/Tenant Management/i)).toBeInTheDocument();
  });

  it('allows filtering by committee member', () => {
    render(<WorkDistributionList />);

    // Click on member filter "Sachin" in filter chips
    const sachinBtns = screen.getAllByRole('button', { name: 'Sachin' });
    fireEvent.click(sachinBtns[0]);

    // Sachin is assigned to Security, Park+, Accounts & Finance (all members), and Tenant Management
    expect(screen.getByText(/Security & Fire Safety/i)).toBeInTheDocument();
    expect(screen.getByText(/Park\+ \/ MyGate & Resident Complaints/i)).toBeInTheDocument();
    expect(screen.getByText(/Tenant Management/i)).toBeInTheDocument();

    // Swimming pool is Ashu / Himanshu, should not be shown
    expect(screen.queryByText(/Swimming Pool Management/i)).not.toBeInTheDocument();
  });

  it('allows searching within portfolios', () => {
    render(<WorkDistributionList />);

    const searchInput = screen.getByPlaceholderText(/Search portfolios, members/i);
    fireEvent.change(searchInput, { target: { value: 'swimming' } });

    expect(screen.getByText(/Swimming Pool Management/i)).toBeInTheDocument();
    expect(screen.queryByText(/Security & Fire Safety/i)).not.toBeInTheDocument();
  });

  it('switches to Requested 10 Flats tab and displays all 10 flats and owners', () => {
    render(<WorkDistributionList />);

    // Click on "Requested 10 Flats Owners List" tab
    const ownersTabBtn = screen.getByRole('tab', { name: /Requested 10 Flats Owners List/i });
    fireEvent.click(ownersTabBtn);

    // Verify all 10 requested flats are in the document
    const expectedFlats = ['A-204', 'A-301', 'A-403', 'A-501', 'A-505', 'A-602', 'A-603', 'A-607', 'A-704', 'A-1007'];
    expectedFlats.forEach(flat => {
      expect(screen.getAllByText(flat).length).toBeGreaterThan(0);
    });

    // Check key owners (use getAllByText as names appear in both cards and table)
    expect(screen.getAllByText(/Mrs. Neha Sandeep Goyal/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Mr. Sandeep Kumar Mohanty/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Mr. Prashant S. Mahindrakar/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Mr. Himansu Sekhar Behera/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Mr. Sachin Nivrutti Savakhande/i).length).toBeGreaterThan(0);
  });

  it('switches to Committee Members Roster tab and displays member cards', () => {
    render(<WorkDistributionList />);

    const membersTabBtn = screen.getByRole('tab', { name: /Committee Members Roster/i });
    fireEvent.click(membersTabBtn);

    expect(screen.getByText(/Managing Committee Members — 10 Member Roster/i)).toBeInTheDocument();
    expect(screen.getByText('Sachin')).toBeInTheDocument();
    expect(screen.getByText('Amit')).toBeInTheDocument();
    expect(screen.getByText('Prakash')).toBeInTheDocument();
    expect(screen.getByText('Prashant')).toBeInTheDocument();
    expect(screen.getByText('Neha')).toBeInTheDocument();
    expect(screen.getByText('Afroza')).toBeInTheDocument();
    expect(screen.getByText('Himansu')).toBeInTheDocument();
    expect(screen.getAllByText(/Flat A-602/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Ahmed')).toBeInTheDocument();
    expect(screen.getByText('Sandeep')).toBeInTheDocument();
  });

  it('displays flat number for Himansu in table and allows toggling', () => {
    render(<WorkDistributionList />);

    // By default showFlatNumbers is true, check Himansu (A-602)
    expect(screen.getAllByText(/Himansu \(A-602\)/i).length).toBeGreaterThan(0);

    // Toggle off flat numbers
    const toggle = screen.getByLabelText(/Show Flat Numbers in Table/i);
    fireEvent.click(toggle);

    // Now should show without flat number
    expect(screen.getAllByText('Himansu').length).toBeGreaterThan(0);
  });

  it('switches to Official Notice Scan tab and renders the original image', () => {
    render(<WorkDistributionList />);

    const scanTabBtn = screen.getByRole('tab', { name: /Official Notice Scan/i });
    fireEvent.click(scanTabBtn);

    expect(screen.getByText(/Official Work Distribution Circular Scan/i)).toBeInTheDocument();
    const scanImg = screen.getByAltText(/Official Majestique Euriska Work Distribution Notice/i);
    expect(scanImg).toBeInTheDocument();
    expect(scanImg).toHaveAttribute('src', '/visuals/work_distribution_list.png');
  });
});
