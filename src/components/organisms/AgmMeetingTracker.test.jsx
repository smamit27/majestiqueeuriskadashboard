import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AgmMeetingTracker from './AgmMeetingTracker';

describe('AgmMeetingTracker Component', () => {
  it('renders official society header and meeting details for AGM 2026', () => {
    render(<AgmMeetingTracker isAdmin={true} />);
    expect(screen.getByText(/OFFICIAL SOCIETY GOVERNANCE ARCHIVE/i)).toBeInTheDocument();
    expect(screen.getByText(/Majestique Euriska 'A' Building Co-operative Housing Society Ltd/i)).toBeInTheDocument();
    expect(screen.getByText(/Sunday, 6th September 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Society Clubhouse/i)).toBeInTheDocument();
  });

  it('renders all 7 resolutions by default for AGM 2026', () => {
    render(<AgmMeetingTracker isAdmin={true} />);
    expect(screen.getByText('Annual Audit Report')).toBeInTheDocument();
    expect(screen.getByText('Fixed Deposit Mandate')).toBeInTheDocument();
    expect(screen.getByText('Solar Power Project')).toBeInTheDocument();
    expect(screen.getByText('Appointment of Auditor')).toBeInTheDocument();
    expect(screen.getByText('Maintenance & Sinking Fund')).toBeInTheDocument();
    expect(screen.getByText('Shop Dues Recovery')).toBeInTheDocument();
    expect(screen.getByText('Covered Parking — Sumit')).toBeInTheDocument();
  });

  it('filters resolutions when clicking status pills', () => {
    render(<AgmMeetingTracker isAdmin={true} />);
    const passedBtn = screen.getByRole('button', { name: /Passed \(2\)/i });
    fireEvent.click(passedBtn);

    // Only Passed resolutions should be present
    expect(screen.getByText('Annual Audit Report')).toBeInTheDocument();
    expect(screen.getByText('Fixed Deposit Mandate')).toBeInTheDocument();
    expect(screen.queryByText('Solar Power Project')).not.toBeInTheDocument();
    expect(screen.queryByText('Covered Parking — Sumit')).not.toBeInTheDocument();
  });

  it('filters resolutions via search input', () => {
    render(<AgmMeetingTracker isAdmin={true} />);
    const searchInput = screen.getByPlaceholderText(/Search resolutions/i);
    fireEvent.change(searchInput, { target: { value: 'Solar' } });

    expect(screen.getByText('Solar Power Project')).toBeInTheDocument();
    expect(screen.queryByText('Annual Audit Report')).not.toBeInTheDocument();
  });

  it('switches to Executive Action Summary & Mandate tab', () => {
    render(<AgmMeetingTracker isAdmin={true} />);
    const summaryTab = screen.getByRole('button', { name: /Executive Action Summary & Mandate/i });
    fireEvent.click(summaryTab);

    expect(screen.getByText(/PASSED & IMPLEMENTED/i)).toBeInTheDocument();
    expect(screen.getByText(/Formal Review Mandate/i)).toBeInTheDocument();
  });

  it('switches to Society Signatories & Seal Verification tab', () => {
    render(<AgmMeetingTracker isAdmin={true} />);
    const societyTab = screen.getByRole('button', { name: /Signatories & Seal Verification/i });
    fireEvent.click(societyTab);

    expect(screen.getByText(/Committee Signatories/i)).toBeInTheDocument();
    expect(screen.getByText(/A Singh • Signed on AGM Minutes/i)).toBeInTheDocument();
    expect(screen.getByText(/Society Official Stamp & Legal Details/i)).toBeInTheDocument();
  });

  it('switches to Original Signed Document tab and renders PDF viewer', () => {
    render(<AgmMeetingTracker isAdmin={true} />);
    const pdfTab = screen.getByRole('button', { name: /Original Signed Document/i });
    fireEvent.click(pdfTab);

    expect(screen.getByText(/Signed & Sealed AGM 2026/i)).toBeInTheDocument();
    expect(screen.getByTitle(/AGM 2026.*PDF/i)).toBeInTheDocument();
  });

  it('switches meeting to AGM 2025 and loads its 16 resolutions and details', () => {
    render(<AgmMeetingTracker isAdmin={true} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'agm-2025' } });

    expect(screen.getByText(/Sunday, 2nd November 2025/i)).toBeInTheDocument();
    expect(screen.getByText(/Roadside Trash & Common Area Cleanliness/i)).toBeInTheDocument();
    expect(screen.getByText(/Parking on Driveway/i)).toBeInTheDocument();
    expect(screen.getByText(/Painting & Cleanliness – Society Outside Walls/i)).toBeInTheDocument();
    expect(screen.getByText(/Tenant Shifting Charges & Verification/i)).toBeInTheDocument();
  });

  it('switches meeting to SGM 2025 and loads maintenance revision and EPDM flooring', () => {
    render(<AgmMeetingTracker isAdmin={true} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'sgm-2025' } });

    expect(screen.getByText(/Sunday, 15th June 2025/i)).toBeInTheDocument();
    expect(screen.getByText(/Revision of Monthly Maintenance Charges/i)).toBeInTheDocument();
    expect(screen.getByText(/Approval for EPDM Safety Flooring/i)).toBeInTheDocument();
    expect(screen.getByText(/Appointment of Auditor for FY 2023–24 and 2024 - 2025/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Mr\. Balaji Chaudhari/i).length).toBeGreaterThanOrEqual(1);
  });
});
