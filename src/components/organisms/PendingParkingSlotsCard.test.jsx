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

  it('allows selecting a flat from the dropdown and switches to the separate notice view', () => {
    render(<PendingParkingSlotsCard flatsList={['A-101', 'A-201', 'A-301']} />);

    // Locate the select dropdown in the toolbar
    const select = screen.getByLabelText(/Select flat for notice/i);
    expect(select).toBeInTheDocument();

    // Change dropdown to A-201
    fireEvent.change(select, { target: { value: 'A-201' } });

    // Should switch to the Individual Flat Notice view
    expect(screen.getByText(/URGENT SUBMISSION & VERIFICATION/i)).toBeInTheDocument();
    expect(screen.getByText(/Flat No\. A-201/i)).toBeInTheDocument();
    expect(screen.getByText(/All Flats Register/i)).toBeInTheDocument();
  });

  it('switches to notice view when clicking the "Make Notice" button', () => {
    render(<PendingParkingSlotsCard flatsList={['A-101', 'A-201']} />);

    const makeNoticeBtn = screen.getByRole('button', { name: /Make Notice/i });
    fireEvent.click(makeNoticeBtn);

    // Verify notice view is shown
    expect(screen.getByText(/URGENT SUBMISSION & VERIFICATION/i)).toBeInTheDocument();
    expect(screen.getByText(/Flat No\. A-101/i)).toBeInTheDocument();

    // Verify required checklist items: Agreement and Slot ID are present
    expect(screen.getByText(/Copy of Agreement \/ Builder Allotment Letter/i)).toBeInTheDocument();
    expect(screen.getByText(/Exact Slot Identification Number/i)).toBeInTheDocument();

    // Verify removed items are NOT present
    expect(screen.queryByText(/Copy of Vehicle Registration Certificate/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/society security directory/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/wheel-clamping/i)).not.toBeInTheDocument();
  });

  it('navigates back to the 3-column register when clicking "All Flats Register"', () => {
    render(<PendingParkingSlotsCard flatsList={['A-101', 'A-201']} initialView="notice" initialSelectedFlat="A-101" />);

    // Currently on notice view
    expect(screen.getByText(/URGENT SUBMISSION & VERIFICATION/i)).toBeInTheDocument();

    const backBtn = screen.getByRole('button', { name: /All Flats Register/i });
    fireEvent.click(backBtn);

    // Now back on register view
    expect(screen.getByText('Flats with Pending Parking Slot Details')).toBeInTheDocument();
  });

  it('clicking the row quick notice button navigates directly to that flat notice', () => {
    render(<PendingParkingSlotsCard flatsList={['A-101', 'A-201', 'A-301']} />);

    // Filter to the row button for A-201
    const rowNoticeBtn = screen.getByTitle('Make individual notice for Flat A-201');
    fireEvent.click(rowNoticeBtn);

    // Notice view for A-201 should be rendered
    expect(screen.getByText(/Flat No\. A-201/i)).toBeInTheDocument();
    expect(screen.getByText(/URGENT SUBMISSION & VERIFICATION/i)).toBeInTheDocument();
  });

  it('switches to the official General Society Notice when clicking "General Notice"', () => {
    render(<PendingParkingSlotsCard flatsList={['A-101', 'A-201', 'A-301']} />);

    const generalNoticeBtn = screen.getByRole('button', { name: /General Notice/i });
    fireEvent.click(generalNoticeBtn);

    // Verify official circular title and legal references
    expect(screen.getByText('CIRCULAR / OFFICIAL NOTICE')).toBeInTheDocument();
    expect(screen.getByText(/Issued under Maharashtra Co-operative Societies Act 1960 & Society Bye-Laws Nos\. 78 to 84/i)).toBeInTheDocument();

    // Verify bilingual society name
    expect(screen.getByText(/मॅजेस्टिक युरिस्का 'ए' बिल्डिंग सहकारी गृहरचना संस्था मर्यादित/i)).toBeInTheDocument();
    expect(screen.getByText(/REGISTER OF FLATS REQUIRING COVERED PARKING SLOT REGULARIZATION/i)).toBeInTheDocument();

    // Verify signatories and official seal
    expect(screen.getByText('Hon. Secretary')).toBeInTheDocument();
    expect(screen.getByText('Hon. Chairman')).toBeInTheDocument();
    expect(screen.getByText('★ OFFICIAL SEAL ★')).toBeInTheDocument();

    // Verify quick action buttons
    expect(screen.getByRole('button', { name: /Broadcast on WhatsApp/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Print \/ Save PDF/i })).toBeInTheDocument();
  });

  it('allows jumping between General Notice and Individual Flat Notice', () => {
    render(<PendingParkingSlotsCard flatsList={['A-101', 'A-201']} initialView="general" />);

    // Currently on General Notice
    expect(screen.getByText('CIRCULAR / OFFICIAL NOTICE')).toBeInTheDocument();

    // Switch to Individual Flat Notice
    const indivBtn = screen.getByRole('button', { name: /Individual Flat Notice Letter/i });
    fireEvent.click(indivBtn);

    expect(screen.getByText(/TO THE MEMBER \/ RESIDENT/i)).toBeInTheDocument();
    expect(screen.getByText(/Flat No\. A-101/i)).toBeInTheDocument();

    // Switch back to General Notice
    const genBtn = screen.getByRole('button', { name: /General Notice \(All 30 Flats\)/i });
    fireEvent.click(genBtn);

    expect(screen.getByText('CIRCULAR / OFFICIAL NOTICE')).toBeInTheDocument();
  });
});

