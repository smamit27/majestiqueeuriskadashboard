import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TenantTracker from './TenantTracker';

vi.mock('../../firebase.js', () => ({
  db: null,
  isFirebaseConfigured: false,
  ensureFirebaseSession: vi.fn().mockResolvedValue(null),
}));

// Mock Recharts as it uses SVG and ResizeObserver which isn't supported in jsdom
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
    PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
    Pie: () => <div data-testid="pie" />,
    Cell: () => <div data-testid="cell" />,
    BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
    Bar: () => <div data-testid="bar" />,
    XAxis: () => <div data-testid="xaxis" />,
    YAxis: () => <div data-testid="yaxis" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
    CartesianGrid: () => <div data-testid="cartesiangrid" />,
  };
});

describe('TenantTracker - Main Components', () => {
  it('renders the main heading and metrics properly after loading', async () => {
    render(<TenantTracker isAdmin={false} />);
    
    // Wait for async loading to finish
    expect(await screen.findByRole('heading', { name: /Tenant & Occupant Tracking/i })).toBeInTheDocument();
    
    // Wait for flat data to load
    await screen.findByText('A 1108');
    
    expect(screen.getByText(/Total Flats Tracked/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Tenant\/Other Occupied/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/e-Intercom Enabled/i)).toBeInTheDocument();

    // Verify table columns exist for the new fields
    expect(screen.getByText('Start Date')).toBeInTheDocument();
    expect(screen.getByText('End Date')).toBeInTheDocument();
  });

  it('renders the export CSV button', async () => {
    render(<TenantTracker isAdmin={false} />);
    expect(await screen.findByRole('button', { name: /Export CSV/i })).toBeInTheDocument();
  });

  it('does not show admin action buttons when isAdmin is false', async () => {
    render(<TenantTracker isAdmin={false} />);
    // wait for load
    await screen.findByRole('button', { name: /Export CSV/i });
    expect(screen.queryByRole('button', { name: /Add Flat/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reset Database/i })).not.toBeInTheDocument();
  });

  it('shows admin action buttons when isAdmin is true', async () => {
    render(<TenantTracker isAdmin={true} />);
    expect(await screen.findByRole('button', { name: /Add Flat/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reset Database/i })).toBeInTheDocument();
  });
});

describe('TenantTracker - Filtering and Sorting', () => {
  it('filters results by search text', async () => {
    render(<TenantTracker isAdmin={false} />);
    
    // Wait for flat data to load
    await screen.findByText('A 1108');
    
    const searchInput = screen.getByPlaceholderText(/Search Flat No/i);
    
    // Type specific flat number
    fireEvent.change(searchInput, { target: { value: 'A 1108' } });
    
    // The list should show the matching flat and not others
    expect(screen.getByText('A 1108')).toBeInTheDocument();
    expect(screen.queryByText('A 1107')).not.toBeInTheDocument();
  });

  it('filters results by occupant type selector', async () => {
    render(<TenantTracker isAdmin={false} />);
    
    // Wait for flat data to load
    await screen.findByText('A 1108');
    
    const select = screen.getByLabelText(/Occupant Type Filter/i);
    
    // Switch to Tenants only
    fireEvent.change(select, { target: { value: 'Tenant' } });
    
    // Owner flats should not be shown
    expect(screen.queryByText('A 1108')).not.toBeInTheDocument(); // A 1108 is Owner
    expect(screen.getByText('A 1006')).toBeInTheDocument(); // A 1006 is Tenant
  });
});

describe('TenantTracker - Admin Actions Modals', () => {
  it('opens add flat modal when Add Flat button is clicked', async () => {
    render(<TenantTracker isAdmin={true} />);
    
    // Wait for flat data to load
    await screen.findByText('A 1108');
    
    const addBtn = screen.getByRole('button', { name: /Add Flat/i });
    fireEvent.click(addBtn);
    
    // Form title in modal should be visible
    expect(screen.getByRole('heading', { name: /Add Wing A Flat/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Flat Number/i)).toBeInTheDocument();
    
    // Check that new columns inputs are in form
    expect(screen.getByLabelText(/Start Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/End Date/i)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('closes modal when cancel is clicked', async () => {
    render(<TenantTracker isAdmin={true} />);
    
    // Wait for flat data to load
    await screen.findByText('A 1108');
    
    const addBtn = screen.getByRole('button', { name: /Add Flat/i });
    fireEvent.click(addBtn);
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);
    
    expect(screen.queryByRole('heading', { name: /Add Wing A Flat/i })).not.toBeInTheDocument();
  });
});
