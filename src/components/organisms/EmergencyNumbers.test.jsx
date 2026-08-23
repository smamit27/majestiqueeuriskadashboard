import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EmergencyNumbers from './EmergencyNumbers.jsx';

// Mock firebase
vi.mock('../../firebase.js', () => ({
  db: null,
  isFirebaseConfigured: false
}));

describe('EmergencyNumbers Component', () => {
  it('renders the emergency page header and hero banner', () => {
    render(<EmergencyNumbers isAdmin={false} />);
    expect(screen.getByRole('heading', { name: /Emergency Numbers/i })).toBeInTheDocument();
    expect(screen.getByText(/Quick access to emergency services and society contacts/i)).toBeInTheDocument();
    expect(screen.getByText(/In Emergency/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Dial 112 from any phone/i })).toBeInTheDocument();
  });

  it('renders national emergency services with working tel links', () => {
    render(<EmergencyNumbers isAdmin={false} />);
    expect(screen.getByText(/1. Emergency Services/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Police$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Ambulance$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Fire Brigade$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Women Helpline$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Child Helpline$/i })).toBeInTheDocument();

    const callPolice = screen.getByRole('link', { name: /Call Police at 112/i });
    expect(callPolice).toHaveAttribute('href', 'tel:112');
  });

  it('renders society emergency contacts', () => {
    render(<EmergencyNumbers isAdmin={false} />);
    expect(screen.getByText(/2. Society Emergency Contacts/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Security Gate \(Main\)/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Society Manager/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Committee Member/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Maintenance Emergency/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Electrician$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Plumber$/i })).toBeInTheDocument();
  });

  it('renders important nearby locations with directions buttons', () => {
    render(<EmergencyNumbers isAdmin={false} />);
    expect(screen.getByText(/3. Important Locations Nearby/i)).toBeInTheDocument();
    expect(screen.getByText(/Noble Hospital/i)).toBeInTheDocument();
    expect(screen.getByText(/Hadapsar Police Station/i)).toBeInTheDocument();
    expect(screen.getByText(/Hadapsar Fire Station/i)).toBeInTheDocument();
    expect(screen.getByText(/Apollo Pharmacy 24x7/i)).toBeInTheDocument();

    const getDirectionsBtns = screen.getAllByRole('link', { name: /Get directions to/i });
    expect(getDirectionsBtns.length).toBeGreaterThanOrEqual(4);
    expect(getDirectionsBtns[0].getAttribute('href')).toContain('google.com/maps/dir');
  });

  it('renders safety tips section', () => {
    render(<EmergencyNumbers isAdmin={false} />);
    expect(screen.getByText(/Safety Tips/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Stay Calm/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Call Immediately/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Share Location/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Be Prepared/i })).toBeInTheDocument();
  });

  it('shows edit controls only when isAdmin is true', () => {
    const { rerender } = render(<EmergencyNumbers isAdmin={false} />);
    expect(screen.queryByText(/✏️ Edit/i)).not.toBeInTheDocument();

    rerender(<EmergencyNumbers isAdmin={true} />);
    expect(screen.getAllByText(/✏️ Edit/i).length).toBeGreaterThan(0);
  });
});
