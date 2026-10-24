import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import VisualAgendaPoster, { DEFAULT_AGENDA_ITEMS } from './VisualAgendaPoster.jsx';
import html2canvas from 'html2canvas';

// Mock html2canvas
vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: vi.fn().mockReturnValue('data:image/png;base64,fake-data-url')
  })
}));

describe('VisualAgendaPoster Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header with meeting title, AGENDA badge, date, time and default agenda items', () => {
    render(
      <VisualAgendaPoster 
        meetingDate="Sunday, 25 October 2026"
        meetingTime="11:00 AM"
        meetingType="Management Committee Meeting"
      />
    );

    expect(screen.getByText('Management Committee Meeting')).toBeInTheDocument();
    expect(screen.getByText('AGENDA')).toBeInTheDocument();
    expect(screen.getByText('Sunday, 25 October 2026')).toBeInTheDocument();
    expect(screen.getByText('11:00 AM')).toBeInTheDocument();

    // Verify key agenda items from reference image
    expect(screen.getByText('Beautification of Existing Area')).toBeInTheDocument();
    expect(screen.getByText('Fire Safety System')).toBeInTheDocument();
    expect(screen.getByText('Swimming Pool Filter System')).toBeInTheDocument();
    expect(screen.getByText('Water Conservation and Management')).toBeInTheDocument();
    expect(screen.getByText('A Building Accounts Takeover and Conveyance Deed')).toBeInTheDocument();
    expect(screen.getByText('Water Tank Cleaning')).toBeInTheDocument();
    expect(screen.getByText('Diwali Bonus')).toBeInTheDocument();
    expect(screen.getByText('Society Activity Rules')).toBeInTheDocument();
    expect(screen.getByText('Fencing Near Pragati')).toBeInTheDocument();

    // Verify footer callout
    expect(screen.getByText(/Important: A minimum of 3 members from each committee must attend the meeting/i)).toBeInTheDocument();
  });

  it('renders custom agenda items when passed through props', () => {
    const customItems = [
      { id: 1, title: 'Lift AMC Renewal', description: 'Review quote from Otis for annual maintenance.' },
      { id: 2, title: 'DG Battery Check', description: 'Kirloskar routine inspection scheduled.' }
    ];

    render(<VisualAgendaPoster agendaData={customItems} />);

    expect(screen.getByText('Lift AMC Renewal')).toBeInTheDocument();
    expect(screen.getByText('DG Battery Check')).toBeInTheDocument();
    expect(screen.queryByText('Swimming Pool Filter System')).not.toBeInTheDocument();
  });

  it('toggles color mode between Colorful and Black & White', () => {
    render(<VisualAgendaPoster />);

    const bwBtn = screen.getByTestId('color-mode-bw-btn');
    fireEvent.click(bwBtn);

    // After switching to B&W, poster canvas exists with monochrome theme applied
    const posterCanvas = document.getElementById('agenda-poster-canvas');
    expect(posterCanvas).toBeInTheDocument();

    // Switch back to colorful
    const colorBtn = screen.getByTestId('color-mode-colorful-btn');
    fireEvent.click(colorBtn);
    expect(posterCanvas).toBeInTheDocument();
  });

  it('triggers window.print when clicking Print / PDF button', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<VisualAgendaPoster />);

    const printBtn = screen.getByTestId('export-pdf-btn');
    fireEvent.click(printBtn);

    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it('triggers html2canvas export when clicking Download PNG and Download JPEG', async () => {
    render(<VisualAgendaPoster />);

    const pngBtn = screen.getByTestId('export-png-btn');
    fireEvent.click(pngBtn);

    await waitFor(() => {
      expect(html2canvas).toHaveBeenCalled();
    });

    const jpegBtn = screen.getByTestId('export-jpeg-btn');
    fireEvent.click(jpegBtn);

    await waitFor(() => {
      expect(html2canvas).toHaveBeenCalledTimes(2);
    });
  });
});
