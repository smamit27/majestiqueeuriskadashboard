import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PendingParkingSlotsCard from './PendingParkingSlotsCard.jsx';
import { OFFICIAL_PENDING_PARKING_FLATS } from '../../data/parkingAllotmentData.js';

describe('PendingParkingSlotsCard', () => {
  it('renders title matching user mockup and 3 columns of flats', () => {
    render(<PendingParkingSlotsCard />);

    // Header title and official society logo
    expect(screen.getByText('Flats with Pending Parking Slot Details')).toBeInTheDocument();
    expect(screen.getByAltText('Majestique Euriska Logo')).toBeInTheDocument();

    // 3 column table headers
    const flatNumberHeaders = screen.getAllByText('Flat Number');
    expect(flatNumberHeaders.length).toBe(3);
    const srNoHeaders = screen.getAllByText('Sr. No.');
    expect(srNoHeaders.length).toBe(3);

    // Specific flats from column 1, 2 and 3
    expect(screen.getByText('A-101')).toBeInTheDocument();
    expect(screen.getByText('A-103')).toBeInTheDocument();
    expect(screen.getByText('A-507')).toBeInTheDocument();
    expect(screen.getByText('A-601')).toBeInTheDocument();
    expect(screen.getByText('A-901')).toBeInTheDocument();
    expect(screen.getByText('A-1106')).toBeInTheDocument();
  });

  it('renders Download as PNG Image, Vector SVG, and Copy Flats buttons', () => {
    render(<PendingParkingSlotsCard showControls={true} />);

    expect(screen.getByRole('button', { name: /Download as PNG Image/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Download Vector SVG/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy Flats/i })).toBeInTheDocument();
  });

  it('handles clicking on a flat item', () => {
    const handleSelectFlat = vi.fn();
    render(<PendingParkingSlotsCard onSelectFlat={handleSelectFlat} />);

    const flatItem = screen.getByText('A-101');
    fireEvent.click(flatItem);

    expect(handleSelectFlat).toHaveBeenCalledWith('A-101');
  });

  it('renders custom flatsList if provided', () => {
    const customList = ['A-201', 'A-202', 'A-203'];
    render(<PendingParkingSlotsCard flatsList={customList} />);

    expect(screen.getByText('A-201')).toBeInTheDocument();
    expect(screen.getByText('A-202')).toBeInTheDocument();
    expect(screen.getByText('A-203')).toBeInTheDocument();
  });

  it('renders celebratory empty state when no flats are pending', () => {
    render(<PendingParkingSlotsCard flatsList={[]} />);

    expect(screen.getByText(/All Covered Parking Slots are Confirmed/i)).toBeInTheDocument();
  });

  it('dynamically extracts pending covered flats from parkingRecords prop', () => {
    const sampleRecords = [
      { flat: 'A-101', status: 'Covered', parkingType: 'Covered Parking', parkingNo: '' },
      { flat: 'A-102', status: 'Allotted', parkingType: 'Open Parking', parkingNo: 'OP-39' },
      { flat: 'A-103', status: 'Covered', parkingType: 'Covered Parking', parkingNo: 'CP-05' },
      { flat: 'A-105', status: 'Covered', parkingType: 'Covered Parking', parkingNo: '' }
    ];
    render(<PendingParkingSlotsCard parkingRecords={sampleRecords} flatsList={null} />);

    // A-101 and A-105 have empty parkingNo, while A-103 has CP-05 and A-102 has OP-39
    expect(screen.getByText('A-101')).toBeInTheDocument();
    expect(screen.getByText('A-105')).toBeInTheDocument();
    expect(screen.queryByText('A-102')).not.toBeInTheDocument();
    expect(screen.queryByText('A-103')).not.toBeInTheDocument();
  });
});
