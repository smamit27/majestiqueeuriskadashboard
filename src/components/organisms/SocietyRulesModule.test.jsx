import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SocietyRulesModule from './SocietyRulesModule.jsx';

describe('SocietyRulesModule', () => {
  beforeEach(() => {
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
    // Mock window.print
    window.print = vi.fn();
  });

  it('renders official header with society bylaws and legal information', () => {
    render(<SocietyRulesModule isAdmin={false} userRole="RESIDENT" />);

    expect(screen.getByRole('heading', { level: 1, name: /Society Rules, Bylaws & Community Guidelines/i })).toBeInTheDocument();
    expect(screen.getByText(/PNA\/PNA \(4\)\/HSG\/\(TC\)\/21207\/2019-20/i)).toBeInTheDocument();
    expect(screen.getByText(/Applicable to A, B & C Buildings/i)).toBeInTheDocument();
    expect(screen.getAllByText(/₹500 PER DAY/i).length).toBeGreaterThan(0);
  });

  it('displays category filter pills and rule counts', () => {
    render(<SocietyRulesModule isAdmin={false} userRole="RESIDENT" />);

    expect(screen.getByRole('button', { name: /Parking & Main Gate/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clubhouse & Lawn/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Strict No-Smoking/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Food, Prasad & Cleanliness/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pets & Animals/i })).toBeInTheDocument();
  });

  it('renders rule cards including drilling and parking hours', () => {
    render(<SocietyRulesModule isAdmin={false} userRole="RESIDENT" />);

    expect(screen.getByText(/Drilling & Heavy Construction Hours/i)).toBeInTheDocument();
    expect(screen.getByText(/Allotted Space Parking & Visitor Policy/i)).toBeInTheDocument();
    expect(screen.getByText(/Campus-wide No-Smoking Rule in All Common Areas/i)).toBeInTheDocument();
  });

  it('filters rules dynamically based on search query', () => {
    render(<SocietyRulesModule isAdmin={false} userRole="RESIDENT" />);

    const searchInput = screen.getByPlaceholderText(/Search rules/i);
    fireEvent.change(searchInput, { target: { value: 'drilling' } });

    expect(screen.getByText(/Drilling & Heavy Construction Hours/i)).toBeInTheDocument();
    expect(screen.queryByText(/Campus-wide No-Smoking Rule/i)).not.toBeInTheDocument();

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText(/Campus-wide No-Smoking Rule in All Common Areas/i)).toBeInTheDocument();
  });

  it('filters rules when clicking on category pill', () => {
    render(<SocietyRulesModule isAdmin={false} userRole="RESIDENT" />);

    const petsCategoryBtn = screen.getByRole('button', { name: /Pets & Animals/i });
    fireEvent.click(petsCategoryBtn);

    expect(screen.getByText(/Mandatory Leash & Elevator Etiquette/i)).toBeInTheDocument();
    expect(screen.queryByText(/Drilling & Heavy Construction Hours/i)).not.toBeInTheDocument();
  });

  it('allows copying rule details to clipboard', async () => {
    render(<SocietyRulesModule isAdmin={false} userRole="RESIDENT" />);

    const copyBtns = screen.getAllByRole('button', { name: /Copy/i });
    expect(copyBtns.length).toBeGreaterThan(0);

    fireEvent.click(copyBtns[0]);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  it('opens and handles violation reporting modal', async () => {
    render(<SocietyRulesModule isAdmin={false} userRole="RESIDENT" />);

    const reportBtn = screen.getByRole('button', { name: /Report Rule Violation/i });
    fireEvent.click(reportBtn);

    expect(screen.getByText(/Report Society Rule Violation/i)).toBeInTheDocument();

    const flatInput = screen.getByPlaceholderText(/e\.g\. A-402, B-107, C-801/i);
    fireEvent.change(flatInput, { target: { value: 'A-704' } });

    const detailsInput = screen.getByPlaceholderText(/Provide brief details/i);
    fireEvent.change(detailsInput, { target: { value: 'Car parked in wrong bay' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Report/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Report Logged Successfully/i)).toBeInTheDocument();
  });

  it('triggers window.print when clicking print button', () => {
    render(<SocietyRulesModule isAdmin={false} userRole="RESIDENT" />);

    const printBtn = screen.getByRole('button', { name: /Print/i });
    fireEvent.click(printBtn);

    expect(window.print).toHaveBeenCalled();
  });

  it('renders all 12 official posters and new sports & pool rules', () => {
    render(<SocietyRulesModule isAdmin={false} userRole="RESIDENT" />);

    expect(screen.getByText(/12 Official Posters Archived/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Tap Water & Flush Water Wastage/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Ban on Football & Activities in Corridors\/Lobby/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/No Parking Zone: Lift Area & A-Building Entrance/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Swimming Pool Rules and Regulations/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Table Tennis Society Rules and Regulations/i).length).toBeGreaterThan(0);
  });

  it('dispatches changeTab event to water_management when clicking Visualization Work button', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    render(<SocietyRulesModule isAdmin={false} userRole="RESIDENT" />);

    const visualsBtn = screen.getByRole('button', { name: /Visualization Work/i });
    fireEvent.click(visualsBtn);

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'changeTab',
        detail: 'water_management'
      })
    );
    dispatchSpy.mockRestore();
  });
});
